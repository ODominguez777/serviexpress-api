import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export enum QuotationStatus {
  PENDING = 'pending',
  ACCEPTED = 'accepted',
  REJECTED = 'rejected',
  EPIRED = 'expired',
}

@Schema({ timestamps: true })
export class Quotation {
  @Prop({ type: Types.ObjectId, ref: 'Request', required: true })
  requestId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  handymanId: Types.ObjectId; 

  @Prop({ required: true })
  amount: number; 

  @Prop({ required: true })
  description: string;

  @Prop({
    type: String,
    enum: QuotationStatus,
    default: QuotationStatus.PENDING,
  })
  status: QuotationStatus;

  @Prop({ required: true })
  expiresAt: Date;
}

export type QuotationDocument = Quotation & Document;
export const QuotationSchema = SchemaFactory.createForClass(Quotation);
