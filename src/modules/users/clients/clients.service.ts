import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { UsersService } from '../common/users.service';
import { InjectModel } from '@nestjs/mongoose';
import { Model, PaginateModel, isValidObjectId } from 'mongoose';
import { RatingDocument } from 'src/modules/rating/schemas/rating.schema';
import { UserDocument } from '../common/schemas/user.schema';
import { SkillDocument } from 'src/modules/skill/schemas/skill.schema';
import mongoose from 'mongoose';
import { ChatService } from 'src/modules/chat/chat.service';

@Injectable()
export class ClientsService extends UsersService {
  constructor(
    @InjectModel('User')
    protected readonly userModel: PaginateModel<UserDocument>,
    @InjectModel('Skill') protected readonly skillModel: Model<SkillDocument>,
    @InjectModel('Rating')
    protected readonly ratingModel: Model<RatingDocument>,
    protected readonly chatService: ChatService,
  ) {
    super(userModel, skillModel, ratingModel, chatService);
  }
  async getClientRates(userId: string) {
    const user = await this.findById(userId, true);

    if (!user) {
      throw new NotFoundException('User not found');
    }

    const ratings = await this.ratingModel
      .find({ clientId: user._id })
      .populate({
        path: 'handymanId', // Asegúrate de que handymanId esté relacionado en el esquema
        select: 'name lastName', // Selecciona solo el nombre del handyman
      });
    console.log('Estos son los ratings', ratings);
    if (!ratings || ratings.length === 0) {
      throw new NotFoundException('No ratings found for this client');
    }
    const allRatings = ratings
      .filter((rating) => rating.handymanId)
      .map((rating) => {
        const handyman = rating.handymanId as unknown as {
          _id: string;
          name: string;
          lastName: string;
        };
        return {
          handymanId: handyman._id,
          handymanName: handyman.name,
          handymanLastName: handyman.lastName,
          rating: rating.rating,
        };
      });

    if (allRatings.length === 0) {
      throw new NotFoundException('No ratings found for this client');
    }
    return allRatings;
  }

  async getIndividualRate(clientId: string, handymanId: string) {
    if (!isValidObjectId(handymanId)) {
      throw new BadRequestException('Invalid handyman ID format');
    }

    const rating = await this.ratingModel
      .findOne({
        clientId: new mongoose.Types.ObjectId(clientId),
        handymanId: new mongoose.Types.ObjectId(handymanId),
      })
      .populate({
        path: 'handymanId',
        select: 'name lastName', // Selecciona solo los campos necesarios del handyman
      });

    console.log(rating);
    if (!rating) {
      throw new NotFoundException('No rating found for this handyman');
    }

    const handyman = rating.handymanId as unknown as {
      _id: string;
      name: string;
      lastName: string;
    };
    return {
      handymanId: handyman._id,
      handymanName: handyman.name,
      handymanLastName: handyman.lastName,
      rating: rating.rating,
    };
  }
}
