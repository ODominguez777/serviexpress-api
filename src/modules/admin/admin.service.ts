import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { User, UserDocument } from '../users/common/schemas/user.schema';
import { Model } from 'mongoose';
import { ApiResponse } from '../users/dto/response.dto';
import { ReportUser, ReportUserDocument } from '../report/schemas/report-user.schema';

@Injectable()
export class AdminService {
  constructor(
    @InjectModel(User.name) private readonly userModel: Model<UserDocument>,
    @InjectModel(ReportUser.name)
    private readonly reportUserModel: Model<ReportUserDocument>,
  ) {}

  async userBanManagment(userId: string): Promise<ApiResponse<any>> {
    const user = await this.userModel.findById(userId);
    if (!user) {
      throw new NotFoundException('User not found');
    }

    user.isBanned = !user.isBanned;

    if (user.isBanned) {
      user.tokenVersion += 1;
      user.refreshToken = null;
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

  async getAllUsers(page: number = 1, limit: number = 10): Promise<any> {
    const skip = (page - 1) * limit;

    const [users, total] = await Promise.all([
      this.userModel
        .find()
        .select(
          '_id name lastName profilePicture email phone role municipality neighborhood isBanned personalDescription coverageArea address preferences skills',
        ) // Selecciona solo los campos necesarios
        .populate([
          { path: 'preferences', select: 'skillName -_id' }, // Populate para preferencias
          { path: 'skills', select: 'skillName -_id' }, // Populate para habilidades
        ])
        .skip(skip)
        .limit(limit)
        .exec(),
      this.userModel.countDocuments().exec(),
    ]);

    return {
      users,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async getAllReports(page: number = 1, limit: number = 10): Promise<any> {
    const skip = (page - 1) * limit;

    const [reports, total] = await Promise.all([
      this.reportUserModel
        .find()
        .populate({
          path: 'reporterUserId',
          select: 'name lastName email phone', // Datos del que reporta
        })
        .populate({
          path: 'reportedUserId',
          select: 'name lastName email phone', // Datos del reportado
        })
        .skip(skip)
        .limit(limit)
        .exec(),
      this.reportUserModel.countDocuments().exec(),
    ]);

    return {
      reports,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }
}
