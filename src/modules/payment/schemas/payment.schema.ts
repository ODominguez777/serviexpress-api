import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import * as mongoose from 'mongoose';
import { HydratedDocument } from 'mongoose';

export type PaymentDocument = HydratedDocument<Payment>;

@Schema({ timestamps: true })
export class Payment {
  @Prop({ type: mongoose.Schema.Types.ObjectId, ref: 'Quotation', required: true })
  quotationId: mongoose.Types.ObjectId;

  @Prop({ type: Number, required: true })
  amount: number;

  @Prop({ type: String, required: true })
  currency: string;

  @Prop({ type: String })
  payerEmail: string;

  @Prop({ type: String })
  receiverEmail: string;

  @Prop({ type: String, required: true, unique: true })
  transactionId: string;

  @Prop({ type: String })
  transactionStatus: string;

  @Prop({ type: String })
  paymentMethod: string;
}

export const PaymentSchema = SchemaFactory.createForClass(Payment);
