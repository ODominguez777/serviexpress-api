import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bull';
import { PaymentProcessor } from './payment.processor';
import { PaymentService } from './payment.service';
import { ChatService } from '../chat/chat.service'; // Ajusta el path
import { Quotation } from '../quotations/schemas/quotation.schema';// Ajusta
import { Request } from '../requests/schemas/request.schema'; // Ajusta el path 
import { MongooseModule } from '@nestjs/mongoose';
import { Payment } from './schemas/payment.schema';
import { PaymentModule } from './payment.module';


@Module({
  imports: [
    BullModule.registerQueue({
      name: 'payment',
      redis: {
        host: process.env.REDIS_HOST,
        port: Number(process.env.REDIS_PORT),
        username: process.env.REDIS_USERNAME,
        password: process.env.REDIS_PASSWORD,
      },
    }),
    PaymentModule,
    MongooseModule.forFeature([{ name: 'Quotation', schema: Quotation }]),
    MongooseModule.forFeature([{ name: 'Request', schema: Request }]),
    MongooseModule.forFeature([{ name: 'Payment', schema: Payment }]),
  ],
  providers: [PaymentProcessor, PaymentService, ChatService],
})
export class PaymentQueueModule {}
