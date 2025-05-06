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
import { th } from '@faker-js/faker/.';
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
      [RequestStatus.INVOICED]:
        'You cannot quote a request that has already been invoiced.',
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

    const invoiceMessage = `<strong>Detalles de la factura:<strong/> \n <strong>Costo:<strong/> $${amount} USD`;

    try {
      await this.chat.updateMetadataChannel(channelId, {
        quotationStatus: QuotationStatus.PENDING,
        quotationValue: amount,
        requestStatus: RequestStatus.QUOTED,
      });
      await this.chat.sendMessage(channelId, handymanId, invoiceMessage);
    } catch (error) {
      throw new BadRequestException(error.message);
    }

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

    try {
      await this.chat.updateMetadataChannel(channelId, {
        quotationId: savedQuotation._id,
      });
    } catch (error) {
      throw new BadRequestException('Error updating channel metadata');
    }
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

    const request = await this.requestModel.findById(quotation.requestId);
    if (!request) {
      throw new NotFoundException('Request not found');
    }
    const message = `<strong>Cotización aceptada<strong/>\n\nLa cotización de: <strong>$${quotation.amount} USD<strong/> ha sido aceptada por el cliente.`;
    const channelId = `request-${quotation.requestId.toString()}`;
    try {
      await this.chat.updateMetadataChannel(channelId, {
        requestStatus: RequestStatus.INVOICED,
        quotationStatus: QuotationStatus.ACCEPTED,
      });
      await this.chat.sendMessage(channelId, this.adminId, message);
    } catch (error) {
      throw new BadRequestException(error.message);
    }
    quotation.status = QuotationStatus.ACCEPTED;
    request.status = RequestStatus.INVOICED;
    try {
      await quotation.save();
      await request.save();
    } catch (error) {
      throw new BadRequestException('Error saving quotation or request');
    }

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
    const request = await this.requestModel.findById(quotation.requestId);
    if (!request) {
      throw new NotFoundException('Request not found');
    }
    const message = `<strong>Cotización rechazada<strong/>\n\nLa cotización de: <strong>$${quotation.amount} USD<strong/> ha sido rechazada por el cliente.`;
    const channelId = `request-${quotation.requestId.toString()}`;
    try {
      await this.chat.updateMetadataChannel(channelId, {
        requestStatus: RequestStatus.ACCEPTED,
        quotationStatus: QuotationStatus.REJECTED,
      });
      await this.chat.sendMessage(channelId, this.adminId, message);
    } catch (error) {
      throw new BadRequestException(error.message);
    }
    request.status = RequestStatus.ACCEPTED;
    try {
      await this.quotationModel.deleteOne({ _id: quotationId });
      await request.save();
    } catch (error) {
      throw new BadRequestException('Error saving quotation or request');
    }

    return new ApiResponse(200, 'Quotation rejected successfully', null);
  }

  async updateQuotation(
    quotationId: string,
    handymanId: string,
    updateQuotationDto: CreateQuotationDto,
  ): Promise<ApiResponse<any>> {
    const { amount, description } = updateQuotationDto;

    if (!Types.ObjectId.isValid(quotationId)) {
      throw new BadRequestException('Invalid quotation ID');
    }
    if (!Types.ObjectId.isValid(handymanId)) {
      throw new BadRequestException('Invalid handyman ID');
    }
    const quotation = await this.quotationModel.findById(quotationId);
    if (!quotation) {
      throw new NotFoundException('Quotation not found');
    }
    const request = await this.requestModel.findById(quotation.requestId);

    if (quotation.handymanId.toString() !== handymanId) {
      throw new ForbiddenException(
        'You are not authorized to update this quotation',
      );
    }

    if (!request) {
      throw new NotFoundException('Request not found');
    }

    if (
      !(
        quotation.status === QuotationStatus.REJECTED &&
        request.status === RequestStatus.ACCEPTED
      )
    ) {
      throw new ConflictException('You cannot update this quotation');
    }

    const channelId = `request-${quotation.requestId.toString()}`;
    const botMessage = `<strong>Cotización actualizada<strong>\n\n La cotización de ha sido actualizada por el handyman.`;

    const newQuotationMessage = `<strong>Nueva cotización:<strong/> \n <strong>Costo:<strong/> $${amount} USD \n <strong>Descripción:<strong/> ${description}`;
    try {
      await this.chat.updateMetadataChannel(channelId, {
        quotationStatus: QuotationStatus.PENDING,
        quotationValue: amount,
        requestStatus: RequestStatus.QUOTED,
      });
      await this.chat.sendMessage(channelId, this.adminId, botMessage);
      await this.chat.sendMessage(channelId, handymanId, newQuotationMessage);
    } catch (error) {
      throw new BadRequestException(error.message);
    }

    quotation.amount = amount;
    quotation.description = description;
    quotation.status = QuotationStatus.PENDING;
    quotation.expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    request.status = RequestStatus.QUOTED;

    await request.save();
    const updatedQuotation = await quotation.save();
    return new ApiResponse(
      200,
      'Quotation updated successfully',
      updatedQuotation,
    );
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
