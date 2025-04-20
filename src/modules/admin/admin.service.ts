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

  async userBanManagment(
    userId: string,
  ): Promise<ApiResponse<any>> {
    const user = await this.userModel.findById(userId);
    if (!user) {
      throw new NotFoundException('User not found');
    }

    user.isBanned = !user.isBanned;

    if (user.isBanned) {
      user.tokenVersion += 1;
    }
    await user.save();

    const message = user.isBanned
      ? 'User banned successfully'
      : 'User unbanned successfully';
    return new ApiResponse(200, message, null);
  }

  async deleteAllUsersExceptAdmins(): Promise<void> {
    // Elimina todos los usuarios excepto aquellos con el rol de 'admin'
    await this.userModel.deleteMany({ role: { $ne: 'admin' } });
  }
}
