import {
  ConflictException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { PaginateModel } from 'mongoose';
import { Model } from 'mongoose';
import { User, UserDocument } from './schemas/user.schema';
import { CreateUserDto } from './dto/create-user.dto';
import { encryptGoogleId } from '../../../utils/encryption.utils';
import { ApiResponse } from '../dto/response.dto';
import { Skill, SkillDocument } from '../../skill/schemas/skill.schema';
import { Rating, RatingDocument } from '../../rating/schemas/rating.schema';
import mongoose from 'mongoose';
import { Types } from 'mongoose';
import { UpdateUserDto } from './dto/update-user.dto';
import { CreateClientDto } from '../clients/dto/create-client.dto';
import { CreateHandymanDto } from '../handymen/dto/create-handyman.dto';
import { UpdateClientDto } from '../clients/dto/update-client.dto';
import { UpdateHandymanDto } from '../handymen/dto/update-handyman.dto';
import { get } from 'http';

@Injectable()
export class UsersService {
  constructor(
    @InjectModel(User.name)
    protected readonly userModel: PaginateModel<UserDocument>,
    @InjectModel(Skill.name)
    protected readonly skillModel: Model<SkillDocument>,
    @InjectModel(Rating.name)
    protected readonly ratingModel: Model<RatingDocument>, // Cambia 'any' por el tipo correcto de tu modelo de Rating
  ) {}

  private async validateAndMapsIds(
    items: string[],
    model: Model<any>,
    errorMessage: string,
  ): Promise<Types.ObjectId[]> {
    const documents = await model.find({ skillName: { $in: items } });
    if (documents.length !== items.length) {
      throw new NotFoundException(errorMessage);
    }
    return documents.map((doc) => doc._id as Types.ObjectId);
  }

  async createUser(
    createUserDto: CreateClientDto | CreateHandymanDto,
  ): Promise<ApiResponse<any>> {
    console.log('Create User DTO:', createUserDto);

    let userToSave: any;

    if (createUserDto.role === 'handyman') {
      // Desestructurar solo si el rol es handyman
      userToSave = { ...createUserDto };

      // Validar y convertir skills a ObjectId
      const skillDocuments = await this.validateAndMapsIds(
        createUserDto.skills,
        this.skillModel,
        'One or more skills not found',
      );
      userToSave.skills = skillDocuments.map((skill) => skill._id.toString());

      // Validar y convertir coverageArea si existe
      if (createUserDto.coverageArea) {
        userToSave.coverageArea = createUserDto.coverageArea;
      }
    }

    if (createUserDto.role === 'client') {
      // Desestructurar solo si el rol es client
      userToSave = { ...createUserDto };

      // Validar y convertir preferences a ObjectId
      if (createUserDto.preferences) {
        const preferenceDocuments = await this.validateAndMapsIds(
          createUserDto.preferences,
          this.skillModel,
          'One or more preferences not found',
        );
        userToSave.preferences = preferenceDocuments.map((pref) =>
          pref._id.toString(),
        );
      }
    }

    userToSave.googleId = await encryptGoogleId(createUserDto.googleId);
    // Crear el usuario
    try {
      const existingUser = await this.userModel.findOne({
        email: createUserDto.email,
      });
      if (existingUser) {
        throw new ConflictException('Email already exists');
      }

      await this.userModel.create(userToSave);
      return new ApiResponse(200, 'User created successfully', null);
    } catch (error) {
      throw new InternalServerErrorException(error);
    }
  }

  // async findAllHandymen(
  //   page: number = 1,
  //   limit: number = 10,
  //   skills: string[] = [],
  //   coverageArea: string[] = [],
  // ): Promise<ApiResponse<any>> {
  //   console.log(coverageArea, skills);
  //   const filter = { role: 'handyman', isBanned: false };
  //   let skillIds: Types.ObjectId[] = [];
  //   if (skills.length > 0) {
  //     const skillDocuments = await this.skillModel.find({
  //       skillName: { $in: skills },
  //     });

  //     if (skillDocuments.length === 0) {
  //       return new ApiResponse(404, 'No skills found with the given names', []);
  //     }

  //     skillIds = skillDocuments.map((skill) => skill._id as Types.ObjectId); // Obtener los IDs de las habilidades
  //   }

  //   if (coverageArea.length > 0) {
  //     const coverageAreaDocuments = await this.userModel.find({
  //       coverageArea: { $in: coverageArea },
  //     });

  //     console.log(coverageAreaDocuments);
  //     if (coverageAreaDocuments.length === 0) {
  //       return new ApiResponse(
  //         404,
  //         'No coverage areas found with the given names',
  //         [],
  //       );
  //     }
  //     filter['coverageArea'] = { $in: coverageArea };
  //   }

  //   if (skillIds.length > 0) {
  //     filter['skills'] = { $in: skillIds };
  //   }

  //   const result = await this.userModel.paginate(filter, {
  //     page,
  //     limit,
  //     select:
  //       'name lastName rating profilePicture email phone personalDescription coverageArea',
  //     populate: {
  //       path: 'skills',
  //       select: 'skillName -_id',
  //     },
  //   });

  //   const handymanIds = result.docs.map((handyman) => handyman._id);

  //   if (result.docs.length === 0) {
  //     return new ApiResponse(404, 'No handymen found', []);
  //   }

  //   // Calcular el promedio global de calificaciones (c)
  //   const allRatings = await this.ratingModel.find({
  //     handymanId: { $in: handymanIds },
  //   });
  //   const totalRatingsSum = allRatings.length;
  //   const totalRatingValueSum = allRatings.reduce(
  //     (sum, rating) => sum + rating.rating,
  //     0,
  //   );
  //   const globalAverageRating =
  //     totalRatingsSum > 0 ? totalRatingValueSum / totalRatingsSum : 0;

  //   const minimumVotes = 100;
  //   if (result.totalDocs === 0) {
  //     return new ApiResponse(404, 'No handymen found', []);
  //   }
  //   // Calcular la ponderación para cada handyman

  //   const weightedHandymen = await Promise.all(
  //     result.docs.map(async (handyman) => {
  //       const handymanRatings = await this.ratingModel.find({
  //         handymanId: handyman._id,
  //       });
  //       const totalRatings = handymanRatings.length;
  //       const averageRating =
  //         totalRatings > 0
  //           ? handymanRatings.reduce((sum, r) => sum + r.rating, 0) /
  //             totalRatings
  //           : 0;

  //       console.log(
  //         'HandymanRating:',
  //         handyman.rating,
  //         'Total Ratings:',
  //         totalRatings,
  //         'Average Rating:',
  //         averageRating,
  //       );
  //       const weightedRating =
  //         (totalRatings / (totalRatings + minimumVotes)) * averageRating +
  //         (minimumVotes / (totalRatings + minimumVotes)) * globalAverageRating;

  //       console.log(
  //         'Weighted Rating:',
  //         weightedRating,
  //         'Global Average Rating:',
  //         globalAverageRating,
  //         'Minimum Votes:',
  //         minimumVotes,
  //       );
  //       const adjustedWeightedRating =
  //         totalRatings > 0
  //           ? weightedRating - (minimumVotes - totalRatings) * 0.02
  //           : 0.5;
  //       console.log('Adjusted Weighted Rating:', adjustedWeightedRating);
  //       return {
  //         ...handyman.toObject(),
  //         averageRating,
  //         totalRatings,
  //         weightedRating: adjustedWeightedRating,
  //       };
  //     }),
  //   );

  //   // Ordenar los handymen por la ponderación calculada
  //   const sortedHandymen = weightedHandymen.sort((a, b) => {
  //     if (b.weightedRating === a.weightedRating) {
  //       return b.totalRatings - a.totalRatings; // Priorizar por totalRatings si weightedRating es igual
  //     }
  //     return b.weightedRating - a.weightedRating; // Ordenar por weightedRating
  //   });

  //   // Crear la respuesta paginada manualmente
  //   const response = {
  //     docs: sortedHandymen,
  //     totalDocs: result.totalDocs,
  //     limit: result.limit,
  //     page: result.page,
  //     totalPages: result.totalPages,
  //   };

  //   return new ApiResponse(200, 'Handymen retrieved successfully', response);
  // }

  async updateUserById(
    id: string,
    updateUserDto: UpdateClientDto | UpdateHandymanDto,
  ): Promise<ApiResponse<any>> {
    const user = await this.userModel.findByIdAndUpdate(id, updateUserDto, {
      new: true,
    });
    if (!user) {
      throw new NotFoundException('User not found');
    }
    return new ApiResponse(200, 'User updated successfully', null);
  }

  async updateUserByEmail(
    email: string,
    updateUserDto: UpdateClientDto | UpdateHandymanDto,
  ): Promise<ApiResponse<any>> {
    const user = await this.userModel.findOneAndUpdate(
      { email },
      updateUserDto,
      { new: true },
    );
    if (!user) {
      throw new NotFoundException('User not found');
    }
    return new ApiResponse(200, 'User updated successfully', null);
  }

  async getUserByEmail(email: string): Promise<User> {
    const client = await this.userModel
      .findOne({ email })
      .select('-googleId -source -_id -updatedAt -__v')
      .populate([
        { path: 'skills', select: 'skillName -_id' }, // Populate para skills
        { path: 'preferences', select: 'skillName -_id' }, // Populate para preferences
      ])
      .exec();
    if (!client) {
      throw new NotFoundException('User not found');
    }
    return client;
  }

  async getUsersForAuth(email: string): Promise<User> {
    const user = await this.userModel.findOne({ email });
    if (!user) {
      throw new NotFoundException('Client not found');
    }
    return user;
  }

  async findById(id: string): Promise<any> {
    const user = await this.userModel.findById(id);
    if (!user) {
      throw new NotFoundException('User not found');
    }
    return user;
  }
}
