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
    const payout =  await this.payoutModel.findOne({ senderBatchId }).exec();

    if (!payout) {
      return new ApiResponse(404, 'Payout not found', null);
    }
    payout.paypalFeeOnPayout = paypalFeeOnPayout;
    payout.payoutItemId = payoutItemId;
    payout.transactionId = transactionId;
    payout.status = status;
    payout.transactionErrors = transactionErrors;
    payout.handymanNetAmount = (payout.handymanNetAmount - payout.paypalFeeOnPayout);
    await payout.save();

    return new ApiResponse(200, 'Payout updated', payout);
  }

  async findByHandyman(handymanId: string) {
    return this.payoutModel.find({ handymanId }).sort({ createdAt: -1 }).exec();
  }

  async findById(id: string) {
    return this.payoutModel.findById(id).exec();
  }

  async findAll() {
    return this.payoutModel.find().sort({ createdAt: -1 }).exec();
  }
}
