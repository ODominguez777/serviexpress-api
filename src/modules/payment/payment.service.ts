// payment.service.ts
import { Inject, Injectable } from '@nestjs/common';
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
  async savePayment(
    quotationId: Types.ObjectId,
    netAmount: number,
    paypalFee: number,
    currencyCode: string,
    eventId: string,
    transactionId: string,
    status: string,
  ): Promise<any> {
    if (status !== 'COMPLETED') {
      throw new Error('Payment capture not completed');
    }
    if (
      !quotationId ||
      !netAmount ||
      !paypalFee ||
      !currencyCode ||
      !eventId ||
      typeof eventId !== 'string' ||
      eventId.trim() === '' ||
      !transactionId ||
      !status
    ) {
      return { success: false, message: 'Invalid payment data' };
    }

    const paymentByEventId = await this.paymentModel.findOne({
      $or: [{ webhookId: eventId }, { quotationId }],
    });
    if (paymentByEventId) {
      return { success: false, message: 'Payment already registered' };
    }
    const paymentData = {
      quotationId,
      amount: netAmount,
      currency: currencyCode,
      paypalFee,
      transactionId: transactionId,
      transactionStatus: status,
      webhookId: eventId,
      paymentMethod: 'PayPal',
    };

    try {
      return {
        success: true,
        data: await this.paymentModel.create(paymentData),
      };
    } catch (error) {
      return { success: false, message: 'Error saving payment to MongoDB' };
    }
  }

  // AUN SIN IMPLEMENTAR
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
