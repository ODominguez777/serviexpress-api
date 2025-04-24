import { Injectable, NotFoundException } from '@nestjs/common';
import { UsersService } from '../common/users.service';
import { PaginateModel, Types, Model } from 'mongoose';
import { UserDocument } from '../common/schemas/user.schema';
import { InjectModel } from '@nestjs/mongoose';
import { ApiResponse } from '../dto/response.dto';
import { RatingDocument } from '../../rating/schemas/rating.schema';
import { SkillDocument } from '../../skill/schemas/skill.schema';
import { CreateHandymanDto } from './dto/create-handyman.dto';
import { ChatService } from 'src/modules/chat/chat.service';

@Injectable()
export class HandymenService extends UsersService {
  constructor(
    @InjectModel('User')
    protected readonly userModel: PaginateModel<UserDocument>,
    @InjectModel('Skill') protected readonly skillModel: Model<SkillDocument>,
    @InjectModel('Rating')
    protected readonly ratingModel: Model<RatingDocument>,
    protected readonly chatService: ChatService,
  ) {
    super(userModel, skillModel, ratingModel, chatService);
  }

  async findAllHandymen(
    page: number = 1,
    limit: number = 10,
    skills: string[] = [],
    coverageArea: string[] = [],
  ): Promise<ApiResponse<any>> {
    const filter = { role: 'handyman', isBanned: false };
    let skillIds: Types.ObjectId[] = [];

    // Filtrar por habilidades si se proporcionan
    if (skills.length > 0) {
      const skillDocuments = await this.skillModel.find({
        skillName: { $in: skills },
      });

      if (skillDocuments.length === 0) {
        return new ApiResponse(404, 'No skills found with the given names', []);
      }

      skillIds = skillDocuments.map((skill) => skill._id as Types.ObjectId);
      filter['skills'] = { $in: skillIds };
    }

    // Filtrar por áreas de cobertura si se proporcionan
    if (coverageArea.length > 0) {
      filter['coverageArea'] = { $in: coverageArea };
    }

    // Paginar y devolver los resultados
    const result = await this.userModel.paginate(filter, {
      page,
      limit,
      select:
        'name lastName rating profilePicture email phone personalDescription coverageArea',
      populate: {
        path: 'skills',
        select: 'skillName -_id',
      },
    });

    if (page > result.totalPages) {
      return new ApiResponse(200, `Page ${page} is  out of range`, {
        docs: [],
        totalDocs: result.totalDocs,
        limit: result.limit,
        page: result.page,
        totalPages: result.totalPages,
      });
    }
    if (result.docs.length === 0) {
      return new ApiResponse(404, 'No handymen found', []);
    }

    // Calcular el promedio global de calificaciones
    const handymanIds = result.docs.map((handyman) => handyman._id);
    const allRatings = await this.ratingModel.find({
      handymanId: { $in: handymanIds },
    });

    const totalRatingsSum = allRatings.length;
    const totalRatingValueSum = allRatings.reduce(
      (sum, rating) => sum + rating.rating,
      0,
    );
    const globalAverageRating =
      totalRatingsSum > 0 ? totalRatingValueSum / totalRatingsSum : 0;

    const minimumVotes = 100;

    // Calcular la ponderación para cada handyman
    const weightedHandymen = await Promise.all(
      result.docs.map(async (handyman) => {
        const handymanRatings = await this.ratingModel.find({
          handymanId: handyman._id,
        });
        const totalRatings = handymanRatings.length;
        const averageRating =
          totalRatings > 0
            ? handymanRatings.reduce((sum, r) => sum + r.rating, 0) /
              totalRatings
            : 0;

        const weightedRating =
          (totalRatings / (totalRatings + minimumVotes)) * averageRating +
          (minimumVotes / (totalRatings + minimumVotes)) * globalAverageRating;

        const adjustedWeightedRating =
          totalRatings > 0
            ? weightedRating - (minimumVotes - totalRatings) * 0.02
            : 0.5;

        return {
          ...handyman.toObject(),
          averageRating,
          totalRatings,
          weightedRating: adjustedWeightedRating,
        };
      }),
    );

    // Ordenar los handymen por la ponderación calculada
    const sortedHandymen = weightedHandymen.sort((a, b) => {
      if (b.weightedRating === a.weightedRating) {
        return b.totalRatings - a.totalRatings; // Priorizar por totalRatings si weightedRating es igual
      }
      return b.weightedRating - a.weightedRating; // Ordenar por weightedRating
    });

    // Crear la respuesta paginada manualmente
    const response = {
      docs: sortedHandymen,
      totalDocs: result.totalDocs,
      limit: result.limit,
      page: result.page,
      totalPages: result.totalPages,
    };

    return new ApiResponse(200, 'Handymen retrieved successfully', response);
  }
}
