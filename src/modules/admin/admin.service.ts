import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { User, UserDocument } from '../users/common/schemas/user.schema';
import { Model } from 'mongoose';
import { ApiResponse } from '../users/dto/response.dto';

@Injectable()
export class AdminService {
  constructor(
    @InjectModel(User.name) private readonly userModel: Model<UserDocument>,
  ) {}

  async userBanManagment(userId: string, isBanned: boolean): Promise<ApiResponse<any>> {
    const user = await this.userModel.findById(userId);
    if (!user) {
      throw new NotFoundException('User not found');
    }

    user.isBanned = isBanned;
    await user.save();

    const message = isBanned
      ? 'User banned successfully'
      : 'User unbanned successfully';
    return new ApiResponse(200, message, null);
  }

  async deleteAllUsers(): Promise<void> {
    await this.userModel.deleteMany({});
  }

  async deleteAllUsersExceptAdmins(): Promise<void> {
    // Elimina todos los usuarios excepto aquellos con el rol de 'admin'
    await this.userModel.deleteMany({ role: { $ne: 'admin' } });
  }
}
