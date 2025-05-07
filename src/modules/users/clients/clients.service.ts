import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Inject,
} from '@nestjs/common';
import { UsersService } from '../common/users.service';
import { InjectModel } from '@nestjs/mongoose';
import { Model, PaginateModel, isValidObjectId } from 'mongoose';
import { RatingDocument } from 'src/modules/rating/schemas/rating.schema';
import { UserDocument, UserRole } from '../common/schemas/user.schema';
import { SkillDocument } from 'src/modules/skill/schemas/skill.schema';
import mongoose from 'mongoose';
import { CHAT_ADAPTER } from 'src/modules/chat/chat.constants';
import { ChatAdapter } from 'src/modules/chat/adapter/chat.adapter';

import { RequestsService } from 'src/modules/requests/requests.service';
import { ChangeToHandymanDto } from './dto/change-to-handyman.dto';
import { SkillService } from 'src/modules/skill/skills.service';
import { RequestDocument } from 'src/modules/requests/schemas/request.schema';
@Injectable()
export class ClientsService extends UsersService {
  constructor(
    @InjectModel('User')
    protected readonly userModel: PaginateModel<UserDocument>,
    @InjectModel('Skill') protected readonly skillModel: Model<SkillDocument>,
    @InjectModel('Rating')
    protected readonly ratingModel: Model<RatingDocument>,
    @Inject(CHAT_ADAPTER) protected readonly chat: ChatAdapter,
    protected readonly requestsService: RequestsService,
    protected readonly skillService: SkillService,

    @InjectModel('Request')
    protected readonly requestModel: Model<RequestDocument>,
  ) {
    super(
      userModel,
      skillModel,
      ratingModel,
      chat,
      requestsService,
      skillService,
    );
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

  async changeToHandyman(
    clientId: string,
    changeToHandymanDto: ChangeToHandymanDto,
  ) {
    const client = await this.userModel.findById(clientId);

    if (!client) {
      throw new NotFoundException('Client not found');
    }

    
    if (client.role === 'handyman') {
      throw new BadRequestException('User is already a handyman');
    }

    const activeStatuses = [
      'pending',
      'accepted',
      'payed',
      'in_progress',
      'quoted',
      'invoiced',
    ];
    const activeRequests = await this.requestModel.find({
      clientId: client._id,
      status: { $in: activeStatuses },
    });

    if (activeRequests.length > 0) {
      throw new BadRequestException(
        'No puedes cambiar de rol mientras tengas solicitudes activas.',
      );
    }
    const skillIds = await this.skillService.mapSkillNamesToIds(
      changeToHandymanDto.skills,
    );
    if (!skillIds || skillIds.length === 0) {
      throw new NotFoundException('Skills not found');
    }
    client.role = UserRole.HANDYMAN;
    client.municipality = '';
    client.neighborhood = '';
    client.preferences = [];
    client.address = '';
    client.coverageArea = changeToHandymanDto.coverageArea;
    client.personalDescription = changeToHandymanDto.personalDescription;
    client.skills = skillIds;
    client.rating = 0; // Reiniciar la calificación al cambiar a handyman
    client.tokenVersion += 1;
    client.refreshToken = null;
    await client.save();

    return client;
  }
}
