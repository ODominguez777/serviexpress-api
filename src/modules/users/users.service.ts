import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { PaginateModel } from 'mongoose';
import { Model } from 'mongoose';
import { User, UserDocument } from './schemas/user.schema';
import { CreateUserDto } from './dto/create-user.dto';
import { encryptGoogleId } from 'src/utils/encryption.utils';
import { ApiResponse } from './dto/response.dto';
@Injectable()
export class UsersService {
  constructor(
    @InjectModel(User.name) private userModel: PaginateModel<UserDocument>,
  ) {}

  async createUser(createUserDto: CreateUserDto): Promise<User> {
    const googleId = await encryptGoogleId(createUserDto.googleId);
    createUserDto.googleId = googleId;
    return this.userModel.create(createUserDto);
  }

  async findAllHandymen(
    page: number = 1,
    limit: number = 10,
  ): Promise<ApiResponse<any>> {
    const options = {
      page,
      limit,
      select: '-googleId -source', // Excluir los campos googleId y source
    };

    const result = await this.userModel.paginate(
      { role: 'handyman' }, // Filtro para obtener solo handymen
      options,
    );

    if (result.totalDocs === 0) {
      return new ApiResponse(404, 'No handymen found', []);
    }

    return new ApiResponse(200, 'Handymen retrieved successfully', result);
  }

  async getHandymanByEmail(email: string): Promise<User> {
    const handyman = await this.userModel
      .findOne({ email, role: 'handyman' })
      .select('-googleId -source -_id');
    if (!handyman) {
      throw new NotFoundException('Handyman not found');
    }
    return handyman;
  }

  async getClientByEmail(email: string): Promise<User> {
    const client = await this.userModel
      .findOne({ email, role: 'client' })
      .select('-googleId -source -_id');
    if (!client) {
      throw new NotFoundException('Client not found');
    }
    return client;
  }
}
