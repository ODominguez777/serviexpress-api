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
import { encryptGoogleId } from 'src/utils/encryption.utils';
import { ApiResponse } from './dto/response.dto';
import { Skill, SkillDocument } from '../skill/schemas/skill.schema';
import mongoose from 'mongoose';
import { Types } from 'mongoose';
import { UpdateUserDto } from './dto/update-user.dto';

@Injectable()
export class UsersService {
  constructor(
    @InjectModel(User.name) private userModel: PaginateModel<UserDocument>,
    @InjectModel(Skill.name) private skillModel: Model<SkillDocument>,
  ) {}

  async createUser(createUserDto: CreateUserDto): Promise<ApiResponse<any>> {
    const googleId = await encryptGoogleId(createUserDto.googleId);
    createUserDto.googleId = googleId;

    if (
      createUserDto.role === 'handyman' &&
      createUserDto.skills &&
      createUserDto.skills.length > 0
    ) {
      const skillDocuments = await this.skillModel.find({
        skillName: { $in: createUserDto.skills }, // Buscar por nombre de habilidad
      });

      if (skillDocuments.length !== createUserDto.skills.length) {
        throw new NotFoundException('One or more skills not found'); // Si alguna habilidad no se encuentra
      }

      createUserDto.skills = skillDocuments.map(
        (skill) => skill._id as Types.ObjectId,
      ); // Asignar los IDs de las habilidades
    }

    if (
      createUserDto.role === 'client' &&
      createUserDto.preferences &&
      createUserDto.preferences.length > 0
    ) {
      const preferenceDocuments = await this.skillModel.find({
        skillName: { $in: createUserDto.preferences }, // Buscar por nombre de preferencia
      });

      // Si alguna preferencia no se encuentra, lanzar una excepción
      if (preferenceDocuments.length !== createUserDto.preferences.length) {
        throw new NotFoundException('One or more preferences not found');
      }

      // Asignar los IDs de las preferencias al DTO (solo para clientes)
      createUserDto.preferences = preferenceDocuments.map(
        (preference) => preference._id as Types.ObjectId,
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

      await this.userModel.create(createUserDto);
      return new ApiResponse(200, 'User created successfully', null);
    } catch (error) {
      if (error.message === 'Email already exists') {
        // MongoDB error code for duplicates
        throw new ConflictException('Email already exists');
      }
      // Si ocurre otro error, lanzamos una excepción genérica
      throw new InternalServerErrorException('Something went wrong');
    }
  }

  async findAllHandymen(
    page: number = 1,
    limit: number = 10,
    skills: string[] = [],
  ): Promise<ApiResponse<any>> {
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

    const options = {
      page,
      limit,
      select:
        '-googleId -source -_id -createdAt -updatedAt -__v -preferences -role -phone -personalDescription', // Excluir los campos googleId y source
      sort: { rating: -1 },
      populate: {
        path: 'skills',
        select: 'skillName -_id',
      },
    };

    const filter = { role: 'handyman' };
    if (skillIds.length > 0) {
      filter['skills'] = { $in: skillIds };
    }
    const result = await this.userModel.paginate(filter, options);

    if (result.totalDocs === 0) {
      return new ApiResponse(404, 'No handymen found', []);
    }

    return new ApiResponse(200, 'Handymen retrieved successfully', result);
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
