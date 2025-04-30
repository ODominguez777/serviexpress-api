import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  BadRequestException,
  Inject,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import mongoose, { Model, ObjectId, Types } from 'mongoose';

import { User, UserDocument } from '../users/common/schemas/user.schema';
import { SkillService } from '../skill/skills.service';
import { ApiResponse } from '../users/dto/response.dto';
import {
  RequestDocument,
  RequestStatus,
} from '../requests/schemas/request.schema';
import {
  Quotation,
  QuotationDocument,
  QuotationStatus,
} from '../quotations/schemas/quotation.schema';
import { CreateQuotationDto } from './dto/create-quotation.dto';
import { ChatAdapter } from '../chat/adapter/chat.adapter';
import { CHAT_ADAPTER } from '../chat/chat.constants';
import { Cron, CronExpression } from '@nestjs/schedule';
import _ from 'mongoose-paginate-v2';
import { ConfigService } from '@nestjs/config';
@Injectable()
export class QuotationService {
  private adminId: string;
  constructor(
    @InjectModel(Quotation.name)
    private readonly quotationModel: Model<QuotationDocument>,
    @InjectModel(User.name)
    private readonly userModel: Model<UserDocument>,
    @InjectModel('Request')
    private readonly requestModel: Model<RequestDocument>,
    @Inject(CHAT_ADAPTER) private readonly chat: ChatAdapter,
    private readonly configService: ConfigService,
  ) {
    this.adminId = this.configService.get<string>('ADMIN_ID') as string;
  }

  async createQuotation(
    handymanId: string,
    requestId: string,
    createQuotationDto: CreateQuotationDto,
  ): Promise<ApiResponse<any>> {
    const { amount, description } = createQuotationDto;
    const request = await this.requestModel.findById(requestId);

    if (!request) {
      throw new NotFoundException('Request not found');
    }

    if (request.handymanId.toString() !== handymanId) {
      throw new ForbiddenException(
        'You are not authorized to respond to this request',
      );
    }
    const statusMessages: Record<RequestStatus, string> = {
      [RequestStatus.PENDING]:
        'You cannot quote a pending request. It must be accepted first.',
      [RequestStatus.ACCEPTED]: '', // This is the only valid state for quoting
      [RequestStatus.PAYED]:
        'You cannot quote a request that has already been paid.',
      [RequestStatus.IN_PROGRESS]:
        'You cannot quote a request that is in progress.',
      [RequestStatus.QUOTED]: 'This request has already been quoted.',
      [RequestStatus.REJECTED]: 'You cannot quote a rejected request.',
      [RequestStatus.COMPLETED]: 'You cannot quote a completed request.',
      [RequestStatus.EXPIRED]: 'You cannot quote an expired request.',
      [RequestStatus.CANCELLED]: 'You cannot quote a cancelled request.',
    };

    if (request.status !== RequestStatus.ACCEPTED) {
      const errorMessage =
        statusMessages[request.status] || 'You cannot quote this request.';
      throw new ConflictException(errorMessage);
    }

    if (!request._id) {
      throw new NotFoundException('Request ID not found');
    }
    const channelId = `request-${request._id.toString()}`;

    const invoiceMessage = `Detalles de la factura: \n Costo: C$${amount} \n Descripción: ${description}`;
    await this.chat.sendMessage(channelId, handymanId, invoiceMessage);

    const newQuotation = new this.quotationModel({
      requestId: request._id,
      handymanId: new mongoose.Types.ObjectId(handymanId),
      clientId: request.clientId,
      amount,
      description,
      status: 'pending',
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    });
    const savedQuotation = await newQuotation.save();
    request.status = RequestStatus.QUOTED;
    await request.save();
    return new ApiResponse(
      200,
      'Request accepted successfully',
      savedQuotation,
    );

    // Actualizar el estado de la solicitud a "rejected"
  }
  async acceptQuotation(
    quotationId: Types.ObjectId,
    clientId: Types.ObjectId,
  ): Promise<ApiResponse<any>> {
    if (!Types.ObjectId.isValid(quotationId)) {
      throw new BadRequestException('Invalid quotation ID');
    }
    if (!Types.ObjectId.isValid(clientId)) {
      throw new BadRequestException('Invalid clientId ID');
    }

    const quotation = await this.quotationModel.findById(quotationId);
    if (!quotation) {
      throw new NotFoundException('Quotation not found');
    }
    if (quotation.clientId.toString() !== clientId.toString()) {
      throw new ForbiddenException(
        'You are not authorized to accept this quotation',
      );
    }
    if (quotation.status !== 'pending') {
      throw new ConflictException('This quotation has already been processed');
    }

    const message = `**Cotización aceptada**\n\nLa cotización de: _${quotation.amount}_ ha sido aceptada por el cliente.`;
    const channelId = `request-${quotation.requestId.toString()}`;
    try {
      await this.chat.sendMessage(channelId, this.adminId, message);
    } catch (error) {
      throw new BadRequestException(error.message);
    }
    quotation.status = QuotationStatus.ACCEPTED;
    await quotation.save();

    return new ApiResponse(200, 'Quotation accepted successfully', null);
  }

  async rejectQuotation(
    quotationId: Types.ObjectId,
    clientId: Types.ObjectId,
  ): Promise<ApiResponse<any>> {
    if (!Types.ObjectId.isValid(quotationId)) {
      throw new BadRequestException('Invalid quotation ID');
    }
    if (!Types.ObjectId.isValid(clientId)) {
      throw new BadRequestException('Invalid clientId ID');
    }

    const quotation = await this.quotationModel.findById(quotationId);
    if (!quotation) {
      throw new NotFoundException('Quotation not found');
    }

    if (quotation.clientId.toString() !== clientId.toString()) {
      throw new ForbiddenException(
        'You are not authorized to reject this quotation',
      );
    }
    if (quotation.status !== 'pending') {
      throw new ConflictException('This quotation has already been processed');
    }

    const message = `**Cotización rechazada**\n\nLa cotización de: _${quotation.amount}_ ha sido rechazada por el cliente.`;
    const channelId = `request-${quotation.requestId.toString()}`;
    try {
      await this.chat.sendMessage(channelId, this.adminId, message);
    } catch (error) {
      throw new BadRequestException(error.message);
    }
    quotation.status = QuotationStatus.REJECTED;
    await quotation.save();

    return new ApiResponse(200, 'Quotation rejected successfully', null);
  }

  async getQuotationByRequestId(
    requestId: Types.ObjectId,
    clientId: Types.ObjectId,
  ): Promise<ApiResponse<any>> {
    if (!Types.ObjectId.isValid(requestId)) {
      throw new BadRequestException('Invalid request ID');
    }
    if (!Types.ObjectId.isValid(clientId)) {
      throw new BadRequestException('Invalid clientId ID');
    }
    const quotation = await this.quotationModel
      .findOne({ requestId })
      .select('_id amount description status clientId');

    if (!quotation) {
      throw new NotFoundException('No quotation found for this request');
    }

    if (quotation.clientId.toString() !== clientId.toString()) {
      throw new ForbiddenException(
        'You are not authorized to view this quotation',
      );
    }
    return new ApiResponse(200, 'Quotation found', quotation);
  }
}
