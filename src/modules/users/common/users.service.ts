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
      if(error instanceof ConflictException) {
        throw error;
      }else{

        throw new InternalServerErrorException(error);
      }
    }
  }

  async updateUserById(
    id: string,
    updateUserDto: UpdateClientDto | UpdateHandymanDto,
  ): Promise<ApiResponse<any>> {
    // Convertir nombres a ObjectId para skills
    if ('skills' in updateUserDto && Array.isArray(updateUserDto.skills)) {
      const objectIds = await this.validateAndMapsIds(
        updateUserDto.skills,
        this.skillModel,
        'One or more skills not found',
      );
      updateUserDto.skills = objectIds.map((skill) => skill.toString()); // Asignar ObjectId[] al documento
    }

    // Convertir nombres a ObjectId para preferences
    if (
      'preferences' in updateUserDto &&
      Array.isArray(updateUserDto.preferences)
    ) {
      const objectIds = await this.validateAndMapsIds(
        updateUserDto.preferences,
        this.skillModel,
        'One or more preferences not found',
      );
      updateUserDto.preferences = objectIds.map((skill) => skill.toString()); // Asignar ObjectId[] al documento
    }

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
    // Convertir nombres a ObjectId para skills
    if ('skills' in updateUserDto && Array.isArray(updateUserDto.skills)) {
      const objectIds = await this.validateAndMapsIds(
        updateUserDto.skills,
        this.skillModel,
        'One or more skills not found',
      );
      updateUserDto.skills = objectIds.map((skill) => skill.toString()); // Asignar ObjectId[] al documento
    }

    // Convertir nombres a ObjectId para preferences
    if (
      'preferences' in updateUserDto &&
      Array.isArray(updateUserDto.preferences)
    ) {
      const objectIds = await this.validateAndMapsIds(
        updateUserDto.preferences,
        this.skillModel,
        'One or more preferences not found',
      );
      updateUserDto.preferences = objectIds.map((skill) => skill.toString()); // Asignar ObjectId[] al documento
    }

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

  async getUserByEmail(email: string, includeId: boolean = false): Promise<User> {
    const selectFields = includeId
      ? '-googleId -source -updatedAt -__v' // Incluir el _id
      : '-googleId -source -_id -updatedAt -__v'; // Excluir el _id

    const user = await this.userModel
      .findOne({ email })
      .select(selectFields)
      .populate([
        { path: 'skills', select: 'skillName -_id' }, // Populate para skills
        { path: 'preferences', select: 'skillName -_id' }, // Populate para preferences
      ])
      .exec();

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return user;
  }

  async getUsersForAuth(email: string): Promise<User> {
    const user = await this.userModel.findOne({ email });
    if (!user) {
      throw new NotFoundException('User not found');
    }
    return user;
  }

  async findById(id: string): Promise<UserDocument> {
    const user = await this.userModel
      .findById(id)
      .select('-googleId -source -_id -updatedAt -__v')
      .populate([
        { path: 'skills', select: 'skillName -_id' }, // Populate para skills
        { path: 'preferences', select: 'skillName -_id' }, // Populate para preferences
      ]).exec();
    if (!user) {
      throw new NotFoundException('User not found');
    }
    return user;
  }

  async findOneByRefreshToken(refreshToken: string): Promise<UserDocument> {
    const user = await this.userModel.findOne({ refreshToken }).exec();
    if (!user) {
      throw new NotFoundException('User not found');
    }
    return user;
  }
}
