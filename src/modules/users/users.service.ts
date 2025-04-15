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
import { encryptGoogleId } from '../../utils/encryption.utils';
import { ApiResponse } from './dto/response.dto';
import { Skill, SkillDocument } from '../skill/schemas/skill.schema';
import { Rating, RatingDocument } from '../rating/schemas/rating.schema';
import mongoose from 'mongoose';
import { Types } from 'mongoose';
import { UpdateUserDto } from './dto/update-user.dto';

@Injectable()
export class UsersService {
  constructor(
    @InjectModel(User.name) private userModel: PaginateModel<UserDocument>,
    @InjectModel(Skill.name) private skillModel: Model<SkillDocument>,
    @InjectModel(Rating.name) private ratingModel: Model<RatingDocument>, // Cambia 'any' por el tipo correcto de tu modelo de Rating
  ) {}

  async createUser(createUserDto: CreateUserDto): Promise<ApiResponse<any>> {
    console.log('CreateUserDto:', createUserDto); // Log para depuración
    const googleId = await encryptGoogleId(createUserDto.googleId);
    createUserDto.googleId = googleId;

    const userToSave = { ...createUserDto };

    if (
      createUserDto.role === 'handyman' &&
      createUserDto.skills &&
      createUserDto.skills.length > 0
    ) {
      const skillDocuments = await this.skillModel.find({
        skillName: { $in: createUserDto.skills },
      });

      if (skillDocuments.length !== createUserDto.skills.length) {
        throw new NotFoundException('One or more skills not found');
      }

      // Asignar los ObjectId[] al nuevo objeto
      userToSave.skills = skillDocuments.map((skill) => skill._id as string);
    }

    if (
      createUserDto.role === 'client' &&
      createUserDto.preferences &&
      createUserDto.preferences.length > 0
    ) {
      const preferenceDocuments = await this.skillModel.find({
        skillName: { $in: createUserDto.preferences },
      });

      if (preferenceDocuments.length !== createUserDto.preferences.length) {
        throw new NotFoundException('One or more preferences not found');
      }

      // Asignar los ObjectId[] al nuevo objeto
      userToSave.preferences = preferenceDocuments.map(
        (preference) => preference._id as string,
      );
    }

    // Crear el usuario con las habilidades (ahora con los IDs)
    try {
      // Verificar si ya existe un usuario con el mismo email
      const existingUser = await this.userModel.findOne({
        email: createUserDto.email,
      });
      if (existingUser) {
        throw new ConflictException('Email already exists'); // Si ya existe un email
      }

      await this.userModel.create(userToSave);
      return new ApiResponse(200, 'User created successfully', null);
    } catch (error) {
      if (error.message === 'Email already exists') {
        // MongoDB error code for duplicates
        throw new ConflictException('Email already exists');
      }
      // Si ocurre otro error, lanzamos una excepción genérica
      throw new InternalServerErrorException(error);
    }
  }

  async findAllHandymen(
    page: number = 1,
    limit: number = 10,
    skills: string[] = [],
    coverageArea: string[] = [],
  ): Promise<ApiResponse<any>> {
    console.log(coverageArea, skills);
    const filter = { role: 'handyman', isBanned: false };
    let skillIds: Types.ObjectId[] = [];
    if (skills.length > 0) {
      const skillDocuments = await this.skillModel.find({
        skillName: { $in: skills },
      });

      if (skillDocuments.length === 0) {
        return new ApiResponse(404, 'No skills found with the given names', []);
      }

      skillIds = skillDocuments.map((skill) => skill._id as Types.ObjectId); // Obtener los IDs de las habilidades
    }

    if (coverageArea.length > 0) {
      const coverageAreaDocuments = await this.userModel.find({
        coverageArea: { $in: coverageArea },
      });

      console.log(coverageAreaDocuments)
      if (coverageAreaDocuments.length === 0) {
        return new ApiResponse(
          404,
          'No coverage areas found with the given names',
          [],
        );
      }
      filter['coverageArea'] = { $in: coverageArea };
    }

    if (skillIds.length > 0) {
      filter['skills'] = { $in: skillIds };
    }

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

    const handymanIds = result.docs.map((handyman) => handyman._id);

    if (result.docs.length === 0) {
      return new ApiResponse(404, 'No handymen found', []);
    }

    // Calcular el promedio global de calificaciones (c)
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
    if (result.totalDocs === 0) {
      return new ApiResponse(404, 'No handymen found', []);
    }
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

        console.log(
          'HandymanRating:',
          handyman.rating,
          'Total Ratings:',
          totalRatings,
          'Average Rating:',
          averageRating,
        );
        const weightedRating =
          (totalRatings / (totalRatings + minimumVotes)) * averageRating +
          (minimumVotes / (totalRatings + minimumVotes)) * globalAverageRating;

        console.log(
          'Weighted Rating:',
          weightedRating,
          'Global Average Rating:',
          globalAverageRating,
          'Minimum Votes:',
          minimumVotes,
        );
        const adjustedWeightedRating =
          totalRatings > 0
            ? weightedRating - (minimumVotes - totalRatings) * 0.02
            : 0.5;
        console.log('Adjusted Weighted Rating:', adjustedWeightedRating);
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

  async updateUser(
    email: any,
    role: string,
    updateUserDto: UpdateUserDto,
  ): Promise<ApiResponse<any>> {
    const user = await this.userModel.findOne({ email });
    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Mapeo de campos comunes
    const fieldsByRole = {
      common: ['name', 'lastName', 'phone', 'profilePicture'],
      handyman: ['personalDescription', 'skills', 'coverageArea'],
      client: ['municipality', 'neighborhood', 'address', 'preferences'],
    };

    // Combinar los campos comunes con los específicos del rol
    const allowedFields = [
      ...fieldsByRole.common,
      ...(fieldsByRole[role] || []),
    ];

    const definedFields = Object.keys(updateUserDto).filter(
      (field) => updateUserDto[field] !== undefined,
    );

    // Verificar si hay campos no permitidos en el DTO
    const invalidFields = definedFields.filter(
      (field) => !allowedFields.includes(field),
    );

    if (invalidFields.length > 0) {
      throw new UnauthorizedException(
        `You are not allowed to modify the following fields: ${invalidFields.join(', ')}`,
      );
    }
    // Validar y convertir `skills` a IDs si el rol es handyman
    if (
      role === 'handyman' &&
      updateUserDto.skills &&
      updateUserDto.skills.length > 0
    ) {
      const skillDocuments = await this.skillModel.find({
        skillName: { $in: updateUserDto.skills },
      });

      if (skillDocuments.length !== updateUserDto.skills.length) {
        throw new NotFoundException('One or more skills not found');
      }

      updateUserDto.skills = skillDocuments.map(
        (skill) => skill._id as Types.ObjectId,
      );
    }

    // Validar y convertir `preferences` a IDs si el rol es client
    if (
      role === 'client' &&
      updateUserDto.preferences &&
      updateUserDto.preferences.length > 0
    ) {
      const preferenceDocuments = await this.skillModel.find({
        skillName: { $in: updateUserDto.preferences },
      });

      if (preferenceDocuments.length !== updateUserDto.preferences.length) {
        throw new NotFoundException('One or more preferences not found');
      }

      updateUserDto.preferences = preferenceDocuments.map(
        (preference) => preference._id as Types.ObjectId,
      );
    }

    // Actualizar los campos permitidos
    for (const field of allowedFields) {
      if (updateUserDto[field] !== undefined) {
        user[field] = updateUserDto[field];
      }
    }

    await user.save();
    return new ApiResponse(200, 'User updated successfully', null);
  }

  async getHandymanByEmail(email: string): Promise<User> {
    const handyman = await this.userModel
      .findOne({ email, role: 'handyman' })
      .select('-googleId -source -_id -preferences -createdAt -updatedAt -__v')
      .populate('skills', 'skillName -_id')
      .exec();
    if (!handyman) {
      throw new NotFoundException('Handyman not found');
    }
    return handyman;
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

  async findById(userId: string): Promise<User> {
    const user = await this.userModel.findById(userId);

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return user;
  }
}
