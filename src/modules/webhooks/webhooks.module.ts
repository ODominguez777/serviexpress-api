import { Module } from '@nestjs/common';
import { PaypalWebhookController } from './paypal/paypal-webhook.controller';
import { PaypalWebhookService } from './paypal/paypal-webhook.service';
import { OrdersService } from '../payment/paypal/order.service';
import { PaymentService } from '../payment/payment.service';
import { MongooseModule } from '@nestjs/mongoose';
import { Payment, PaymentSchema } from '../payment/schemas/payment.schema';
import { PaymentModule } from '../payment/payment.module';
import { RequestSchema } from '../requests/schemas/request.schema';
import { ChatModule } from '../chat/chat.module';
import { QuotationSchema } from '../quotations/schemas/quotation.schema';
import { PaymentQueueModule } from '../payment/payment-queue.module';
import { BullModule } from '@nestjs/bull';
import { PayoutModule } from '../payouts/payout.module';
import { SendgridModule } from '../sendgrid/sengrid.module';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: Payment.name, schema: PaymentSchema }]),
    MongooseModule.forFeature([{ name: 'Request', schema: RequestSchema }]),
    MongooseModule.forFeature([{ name: 'Quotation', schema: QuotationSchema }]),
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
    ChatModule,
    PaymentQueueModule,
    PayoutModule,
    SendgridModule,
  ],
  controllers: [PaypalWebhookController],
  providers: [PaypalWebhookService, OrdersService, PaymentService],
})
export class WebhooksModule {}
