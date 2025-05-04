// payment.service.ts
import { Injectable } from '@nestjs/common';
import { PaypalService } from './paypal/paypal.service';
import { CreatePaymentDto } from './dto/create-payment.dto';
import { randomUUID } from 'crypto';

import { ConfigService } from '@nestjs/config';
import { InjectModel } from '@nestjs/mongoose';
import { Payment, PaymentDocument } from './schemas/payment.schema';
import { Model, Types } from 'mongoose';
@Injectable()
export class PaymentService {
  constructor(
    @InjectModel(Payment.name) private paymentModel: Model<PaymentDocument>,
    private readonly paypalService: PaypalService,
    private readonly configService: ConfigService,
  ) {}

  /** Registra en MongoDB el resultado de la captura de PayPal */
  async recordPayment(orderData: any): Promise<PaymentDocument> {
    const capture = orderData.purchase_units[0].payments.captures[0];
    if (capture.status !== 'COMPLETED') {
      throw new Error('Payment capture not completed');
    }

    const { quotationId, handymanEmail } = JSON.parse(
      orderData.purchase_units[0].custom_id,
    );

    const paymentData = {
      quotationId: new Types.ObjectId(quotationId as string),
      amount: capture.amount.value,
      currency: capture.amount.currency_code,
      payerEmail: orderData.payer.email_address,
      receiverEmail: orderData.purchase_units[0].payee?.email_address,
      transactionId: capture.id,
      transactionStatus: capture.status,
      paymentMethod: 'PayPal',
    };

    return this.paymentModel.create(paymentData);
  }

  async handlePaymentPayout(orderData: any): Promise<any> {
    const capture = orderData.purchase_units[0].payments.captures[0];
    const amount = parseFloat(capture.amount.value);
    const platformFee = amount * 0.05;
    const handymanAmount = amount - platformFee;
    const { handymanEmail } = JSON.parse(orderData.purchase_units[0].custom_id);
    const platformEmail = this.configService.get<string>('ADMIN_EMAIL');

    const items = [
      {
        note: 'Handyman Payment',
        amount: { currency: 'USD', value: handymanAmount.toFixed(2) },
        receiver: handymanEmail,
        sender_item_id: randomUUID(),
      },
      {
        note: 'Platform Fee',
        amount: { currency: 'USD', value: platformFee.toFixed(2) },
        receiver: platformEmail,
        sender_item_id: randomUUID(),
      },
    ];

    const senderBatchId = `batch_${Date.now()}`;
    return this.paypalService.createPayout(senderBatchId, items);
  }
}
