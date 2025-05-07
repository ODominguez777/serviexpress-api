import {
  ConflictException,
  Inject,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import mongoose, { mongo, PaginateModel } from 'mongoose';
import { Model } from 'mongoose';
import { User, UserDocument, UserRole } from './schemas/user.schema';
import { encryptGoogleId } from '../../../utils/encryption.utils';
import { ApiResponse } from '../dto/response.dto';
import { Skill, SkillDocument } from '../../skill/schemas/skill.schema';
import { Rating, RatingDocument } from '../../rating/schemas/rating.schema';
import { Types } from 'mongoose';
import { CreateClientDto } from '../clients/dto/create-client.dto';
import { CreateHandymanDto } from '../handymen/dto/create-handyman.dto';
import { UpdateClientDto } from '../clients/dto/update-client.dto';
import { UpdateHandymanDto } from '../handymen/dto/update-handyman.dto';
import { CHAT_ADAPTER } from 'src/modules/chat/chat.constants';
import { ChatAdapter } from 'src/modules/chat/adapter/chat.adapter';
import { RequestsService } from 'src/modules/requests/requests.service';
import { ac, r } from '@faker-js/faker/dist/airline-BUL6NtOJ';
import { SkillService } from 'src/modules/skill/skills.service';

@Injectable()
export class UsersService {
  constructor(
    @InjectModel(User.name)
    protected readonly userModel: PaginateModel<UserDocument>,
    @InjectModel(Skill.name)
    protected readonly skillModel: Model<SkillDocument>,
    @InjectModel(Rating.name)
    protected readonly ratingModel: Model<RatingDocument>,
    @Inject(CHAT_ADAPTER) protected readonly chat: ChatAdapter,
    protected readonly requestsService: RequestsService,
    protected readonly skillService: SkillService,
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
      if (error instanceof ConflictException) {
        throw error;
      } else {
        throw new InternalServerErrorException(error);
      }
    }
  }

  async updateUserById(
    id: string,
    updateUserDto: UpdateClientDto | UpdateHandymanDto,
  ): Promise<ApiResponse<any>> {
    const currentUser = await this.userModel.findById(id).exec();
    if (!currentUser) {
      throw new NotFoundException('User not found');
    }

    let shouldUpdateChat = false;

    if (
      ('name' in updateUserDto && updateUserDto.name !== currentUser.name) ||
      ('profilePicture' in updateUserDto &&
        updateUserDto.profilePicture !== currentUser.profilePicture)
    ) {
      shouldUpdateChat = true;
    }
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

    const user = await this.userModel.findByIdAndUpdate<UserDocument>(
      id,
      updateUserDto,
      {
        new: true,
      },
    );

    if (!user) {
      throw new NotFoundException('User not found');
    }

    const userId = (user._id as Types.ObjectId).toString();
    if (shouldUpdateChat) {
      await this.chat.upsertUser(
        userId,
        user.name,
        user.email,
        user.profilePicture,
      );
    }
    return new ApiResponse(200, 'User updated successfully', null);
  }

  async updateUserByEmail(
    email: string,
    updateUserDto: UpdateClientDto | UpdateHandymanDto,
  ): Promise<ApiResponse<any>> {
    const currentUser = await this.userModel.findOne({ email }).exec();
    if (!currentUser) {
      throw new NotFoundException('User not found');
    }
    let shouldUpdateChat = false;
    if (
      ('name' in updateUserDto && updateUserDto.name !== currentUser.name) ||
      ('profilePicture' in updateUserDto &&
        updateUserDto.profilePicture !== currentUser.profilePicture)
    ) {
      shouldUpdateChat = true;
    }

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

    const userId = (user._id as Types.ObjectId).toString();
    if (shouldUpdateChat) {
      await this.chat.upsertUser(
        userId,
        user.name,
        user.email,
        user.profilePicture,
      );
    }
    return new ApiResponse(200, 'User updated successfully', null);
  }

  async searchHandymen(query: string) {
    function normalize(str: string) {
      return str
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLowerCase();
    }

    function includesAllWords(field: string, query: string) {
      const words = normalize(query).split(/\s+/);
      const normalizedField = normalize(field);
      return words.every((word) => normalizedField.includes(word));
    }

    function includesSomeWords(field: string, query: string, minMatches = 2) {
      const words = normalize(query).split(/\s+/);
      const normalizedField = normalize(field);
      let matches = 0;
      for (const word of words) {
        if (normalizedField.includes(word)) matches++;
      }
      return matches >= minMatches;
    }

    const normalizedQuery = normalize(query);

    const allSkills = await this.skillModel.find().select('skillName _id');
    const filteredSkills = allSkills.filter((skill) =>
      normalize(skill.skillName).includes(normalizedQuery),
    );
    const skillIds = filteredSkills.map((s) => s._id);

    const handymen = await this.userModel
      .find({
        role: UserRole.HANDYMAN,
      })
      .select(
        '-googleId -isBanned -tokenVersion -refreshToken -createdAt -updatedAt -merchantId -__v',
      )
      .populate({
        path: 'skills',
        select: 'skillName -_id',
      })
      .sort({ rating: -1 })
      .exec();

    const normalizedHandymen = handymen.filter((user) => {
      const fullName = `${user.name} ${user.lastName}`;
      return (
        includesAllWords(fullName, query) ||
        includesSomeWords(fullName, query, 2) || // al menos 2 palabras coinciden
        normalize(user.name).includes(normalizedQuery) ||
        normalize(user.lastName).includes(normalizedQuery) ||
        includesAllWords(user.personalDescription || '', query) ||
        normalize(user.email).includes(normalizedQuery) ||
        (user.coverageArea || []).some((area) =>
          normalize(area).includes(normalizedQuery),
        ) ||
        (user.skills || []).some(
          (skill) =>
            typeof skill === 'object' &&
            'skillName' in skill &&
            typeof skill.skillName === 'string' &&
            (normalize(query).includes(normalize(skill.skillName)) ||
              normalize(skill.skillName).includes(normalize(query))),
        )
      );
    });

    return normalizedHandymen;
  }

  async getUserByEmail(
    email: string,
    includeId: boolean = false,
    userActiveId: string | null = null,
    activeUserRole: string | null = null,
  ): Promise<User> {
    let activeRequestId;
    const selectFields = includeId
      ? '-googleId -source -updatedAt -__v -refreshToken -isBanned -tokenVersion' // Incluir el _id
      : '-googleId -source -_id -updatedAt -__v -refreshToken -isBanned -tokenVersion'; // Excluir el _id

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
    if (user?.role === 'handyman') {
      const ratingsCount = await this.ratingModel.countDocuments({
        handymanId: user._id,
      });
      // Puedes devolver un objeto plano con la propiedad extra
      const userObj = user.toObject();
      (userObj as any).totalRatings = ratingsCount;

      if (userActiveId && activeUserRole) {
        activeRequestId =
          await this.requestsService.getActiveRequestByHandymanId(
            new mongoose.Types.ObjectId(userActiveId),
            new mongoose.Types.ObjectId(user._id as string),
            activeUserRole,
          );
      }
      if (!activeRequestId) {
        return userObj;
      }
      return { ...userObj, ...activeRequestId };
    }

    if (userActiveId && activeUserRole) {
      activeRequestId = await this.requestsService.getActiveRequestByHandymanId(
        new mongoose.Types.ObjectId(userActiveId),
        new mongoose.Types.ObjectId(user._id as string),
        activeUserRole,
      );
    }
    if (!activeRequestId) {
      return user.toObject();
    } else {
      return { ...user.toObject(), ...activeRequestId };
    }
  }

  async getUsersForAuth(email: string): Promise<User> {
    const user = await this.userModel.findOne({ email });
    if (!user) {
      throw new NotFoundException('User not found');
    }
    return user;
  }
  async getUsersForAuthById(id: string): Promise<User> {
    const user = await this.userModel.findById(id);
    if (!user) {
      throw new NotFoundException('User not found');
    }
    return user;
  }

  async findById(
    id: string,
    includeId: boolean = false,
    userActiveId: string | null = null,
    activeUserRole: string | null = null,
  ): Promise<UserDocument> {
    let activeRequestId;
    const selectFields = includeId
      ? '-googleId -source -updatedAt -__v -refreshToken -isBanned -tokenVersion'
      : '-googleId -source -_id -updatedAt -__v -refreshToken -isBanned -tokenVersion'; // Excluir el _id
    const user = await this.userModel
      .findById(id)
      .select(selectFields)
      .populate([
        { path: 'skills', select: 'skillName -_id' }, // Populate para skills
        { path: 'preferences', select: 'skillName -_id' }, // Populate para preferences
      ])
      .exec();

    if (!user) {
      throw new NotFoundException('User not found');
    }
    if (user.role === 'handyman') {
      const ratingsCount = await this.ratingModel.countDocuments({
        handymanId: user._id,
      });
      // Puedes devolver un objeto plano con la propiedad extra
      const userObj = user.toObject();
      (userObj as any).totalRatings = ratingsCount;
      if (userActiveId && activeUserRole) {
        activeRequestId =
          await this.requestsService.getActiveRequestByHandymanId(
            new mongoose.Types.ObjectId(userActiveId),
            new mongoose.Types.ObjectId(id),
            activeUserRole,
          );
      }
      if (!activeRequestId) {
        return userObj;
      }
      return { ...userObj, ...activeRequestId };
    }

    if (userActiveId && activeUserRole) {
      activeRequestId = await this.requestsService.getActiveRequestByHandymanId(
        new mongoose.Types.ObjectId(userActiveId),
        new mongoose.Types.ObjectId(id),
        activeUserRole,
      );
    }
    if (activeRequestId === undefined) {
      return user.toObject();
    } else {
      return { ...user.toObject(), ...activeRequestId };
    }
  }

  async findOneByRefreshToken(refreshToken: string): Promise<UserDocument> {
    const user = await this.userModel.findOne({ refreshToken }).exec();
    if (!user) {
      throw new NotFoundException('User not found');
    }
    return user;
  }
  async updateRefreshToken(
    userId: string,
    refreshToken: string,
  ): Promise<void> {
    await this.userModel.findByIdAndUpdate(userId, { refreshToken }).exec();
  }
}
