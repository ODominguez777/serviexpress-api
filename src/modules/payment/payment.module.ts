// paypal.module.ts
import { Module } from '@nestjs/common';
import { PaymentService } from './payment.service';
import { PaypalService } from './paypal/paypal.service';
import { Mongoose } from 'mongoose';
import { PaymentSchema } from './schemas/payment.schema';
import { MongooseModule } from '@nestjs/mongoose';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: 'Payment', schema: PaymentSchema }]),
  ],
  providers: [PaymentService, PaypalService],
  exports: [PaymentService, PaypalService],
})
export class PaymentModule {}
