import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

@Schema({ timestamps: true })
export class Payout {
  // Referencias
  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  handymanId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Request' })
  requestId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Quotation' })
  quotationId: Types.ObjectId;

  // Información de la solicitud
  @Prop({ required: true })
  requestTitle: string;

  // Montos y comisiones
  @Prop({ required: true })
  clientPaymentAmount: number;

  @Prop({ required: true })
  paypalFeeOnClientPayment: number;

  @Prop({ required: true })
  appCommission: number;

  @Prop({ required: true })
  amountSentToHandyman: number;

  @Prop({ required: true })
  paypalFeeOnPayout: number;

  @Prop({ required: true })
  handymanNetAmount: number;

  @Prop({ required: true })
  currency: string;

  // Identificadores de PayPal
  @Prop({ required: true })
  payoutBatchId: string;

  @Prop()
  payoutItemId: string;

  @Prop()
  transactionId: string;

  @Prop()
  senderBatchId: string;

  // Estado y errores
  @Prop({ required: true })
  status: string;

  @Prop({ type: Object })
  transactionErrors: any;
}

export type PayoutDocument = Payout & Document;
export const PayoutSchema = SchemaFactory.createForClass(Payout);
