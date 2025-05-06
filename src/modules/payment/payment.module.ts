// paypal.module.ts
import { Module } from '@nestjs/common';
import { PaymentService } from './payment.service';
import { PaypalService } from './paypal/paypal.service';
import { Mongoose } from 'mongoose';
import { PaymentSchema } from './schemas/payment.schema';
import { MongooseModule } from '@nestjs/mongoose';
import { RequestSchema } from '../requests/schemas/request.schema';
import { ChatModule } from '../chat/chat.module';
import { QuotationSchema } from '../quotations/schemas/quotation.schema';
@Module({
  imports: [
    MongooseModule.forFeature([{ name: 'Payment', schema: PaymentSchema }]),
    MongooseModule.forFeature([{ name: 'Request', schema: RequestSchema }]),
    MongooseModule.forFeature([{ name: 'Quotation', schema: QuotationSchema }]),
    ChatModule,
  ],
  providers: [PaymentService, PaypalService],
  exports: [PaymentService, PaypalService],
})
export class PaymentModule {}
