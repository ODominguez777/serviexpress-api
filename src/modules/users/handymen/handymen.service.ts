import { Inject, Injectable } from '@nestjs/common';
import { UsersService } from '../common/users.service';
import { PaginateModel, Types, Model } from 'mongoose';
import { UserDocument } from '../common/schemas/user.schema';
import { InjectModel } from '@nestjs/mongoose';
import { ApiResponse } from '../dto/response.dto';
import { RatingDocument } from '../../rating/schemas/rating.schema';
import { SkillDocument } from '../../skill/schemas/skill.schema';
import { CHAT_ADAPTER } from 'src/modules/chat/chat.constants';
import { ChatAdapter } from 'src/modules/chat/adapter/chat.adapter';
import { RequestsService } from 'src/modules/requests/requests.service';
import { all } from 'axios';
import { SkillService } from 'src/modules/skill/skills.service';

@Injectable()
export class HandymenService extends UsersService {
  constructor(
    @InjectModel('User')
    protected readonly userModel: PaginateModel<UserDocument>,
    @InjectModel('Skill') protected readonly skillModel: Model<SkillDocument>,
    @InjectModel('Rating')
    protected readonly ratingModel: Model<RatingDocument>,
    @Inject(CHAT_ADAPTER) protected readonly chat: ChatAdapter,
    protected readonly requestsService: RequestsService,
    protected readonly skillService: SkillService,
  ) {
    super(userModel, skillModel, ratingModel, chat, requestsService, skillService);
  }

  async findAllHandymen(
    page: number = 1,
    limit: number = 10,
    skills: string[] = [],
    coverageArea: string[] = [],
  ): Promise<ApiResponse<any>> {
    page = Number.isFinite(page) && page > 0 ? Math.floor(page) : 1;
    limit = Number.isFinite(limit) && limit > 0 ? Math.floor(limit) : 10;
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

    const allHandymen = await this.userModel
      .find(filter)
      .select(
        'name lastName rating profilePicture email phone personalDescription coverageArea',
      )
      .populate({
        path: 'skills',
        select: 'skillName -_id',
      });
    if (allHandymen.length === 0) { 
      return new ApiResponse(404, 'No handymen found', []);
    }

    // 2. Calcular el promedio global de calificaciones
    const handymanIds = allHandymen.map((handyman) => handyman._id);
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

    // 3. Calcular la ponderación para cada handyman
    const weightedHandymen = await Promise.all(
      allHandymen.map(async (handyman) => {
        const handymanRatings = allRatings.filter(
          (r) =>
            r.handymanId.toString() ===
            (handyman._id as unknown as string).toString(),
        );
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
    // 4. Ordenar por ponderación
    const sortedHandymen = weightedHandymen.sort((a, b) => {
      if (b.weightedRating === a.weightedRating) {
        return b.totalRatings - a.totalRatings;
      }
      return b.weightedRating - a.weightedRating;
    });

    // Paginar y devolver los resultados
    const totalDocs = sortedHandymen.length;
    const totalPages = Math.ceil(totalDocs / limit);
    const pagedHandymen = sortedHandymen.slice(
      (page - 1) * limit,
      page * limit,
    );
    const response = {
      docs: pagedHandymen,
      totalDocs,
      limit,
      page,
      totalPages,
    };

    return new ApiResponse(200, 'Handymen retrieved successfully', response);
  }
}
