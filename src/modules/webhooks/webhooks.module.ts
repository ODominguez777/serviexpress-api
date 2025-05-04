import { Module } from '@nestjs/common';
import { PaypalWebhookController } from './paypal/paypal-webhook.controller';
import { PaypalWebhookService } from './paypal/paypal-webhook.service';
import { OrdersService } from '../payment/paypal/order.service';
import { PaymentService } from '../payment/payment.service';
import { MongooseModule } from '@nestjs/mongoose';
import { Payment, PaymentSchema } from '../payment/schemas/payment.schema';
import { PaymentModule } from '../payment/payment.module';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: Payment.name, schema: PaymentSchema }]),
    PaymentModule,
  ],
  controllers: [PaypalWebhookController],
  providers: [PaypalWebhookService, OrdersService, PaymentService],
})
export class WebhooksModule {}
