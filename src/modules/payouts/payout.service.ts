import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Payout, PayoutDocument } from './schemas/payout.schema';
import { CreatePayoutDto } from './dto/create-payout.dto';
import { UpdatePayoutDto } from './dto/update-payout.dto';
import { ApiResponse } from '../users/dto/response.dto';

@Injectable()
export class PayoutService {
  constructor(
    @InjectModel(Payout.name)
    private readonly payoutModel: Model<PayoutDocument>,
  ) {}

  async createPayout(data: CreatePayoutDto): Promise<Payout> {
    return this.payoutModel.create({
      ...data,
      handymanId: data.handymanId
        ? new Types.ObjectId(data.handymanId)
        : undefined,
      requestId: data.requestId
        ? new Types.ObjectId(data.requestId)
        : undefined,
      quotationId: data.quotationId
        ? new Types.ObjectId(data.quotationId)
        : undefined,
    });
  }

  async updatePayout(
    senderBatchId: string,
    data: UpdatePayoutDto,
  ): Promise<ApiResponse<any>> {
    const {
      paypalFeeOnPayout,
      payoutItemId,
      transactionId,
      status,
      transactionErrors,
    } = data;
    const payout = await this.payoutModel.findOne({ senderBatchId }).exec();

    if (!payout) {
      return new ApiResponse(404, 'Payout not found', null);
    }
    payout.paypalFeeOnPayout = paypalFeeOnPayout;
    payout.payoutItemId = payoutItemId;
    payout.transactionId = transactionId;
    payout.status = status;
    payout.transactionErrors = transactionErrors;
    await payout.save();

    return new ApiResponse(200, 'Payout updated', payout);
  }

  async findByHandyman(handymanId: string) {
    return this.payoutModel
      .find({ handymanId })
      .populate({
        path: 'requestId',
        populate: {
          path: 'clientId', // Asegúrate que el campo en tu esquema de Request sea 'clientId'
          model: 'User', // El modelo correspondiente al cliente
        },
      })
      .sort({ createdAt: -1 })
      .exec();
  }

  async findHandymanPayoutByRequest(
    handymanId: string,
    requestId: string,
  ): Promise<ApiResponse<any>> {
    const payout = await this.payoutModel
      .findOne({
        handymanId: new Types.ObjectId(handymanId),
        requestId: new Types.ObjectId(requestId),
      })
      .populate({
        path: 'requestId',
        populate: {
          path: 'clientId',
          model: 'User',
        },
      })
      .exec();

    if (!payout) {
      return new ApiResponse(404, 'Payout not found', null);
    }

    const request = payout.requestId as any;

    if (!request) {
      return new ApiResponse(404, 'Request not found', null);
    }
    const client = request?.clientId as any;

    if (!client) {
      return new ApiResponse(404, 'Client not found', null);
    }
    const data = {
      clientName: client?.name ?? null,
      clientLastName: client?.lastName ?? null,
      requestTitle: request?.title ?? null,
      requestDescription: request?.description ?? null,
      completedAt: request?.updatedAt ?? null,
      clientPaymentAmount: payout.clientPaymentAmount,
      paypalFeeOnClientPayment: payout.paypalFeeOnClientPayment,
      appCommission: payout.appCommission,
      amountSentToHandyman: payout.amountSentToHandyman,
      paypalFeeOnPayout: payout.paypalFeeOnPayout,
      handymanNetAmount: payout.handymanNetAmount,
    };

    return new ApiResponse(200, 'Payout found', data);
  }

  async findById(id: string) {
    return this.payoutModel.findById(id).exec();
  }

  async findAll() {
    return this.payoutModel.find().sort({ createdAt: -1 }).exec();
  }
}
