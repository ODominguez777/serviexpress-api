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

@Module({
  imports: [
    MongooseModule.forFeature([{ name: Payment.name, schema: PaymentSchema }]),
    MongooseModule.forFeature([{ name: 'Request', schema: RequestSchema }]),
    MongooseModule.forFeature([{ name: 'Quotation', schema: QuotationSchema }]),
    PaymentModule,
    ChatModule,
  ],
  controllers: [PaypalWebhookController],
  providers: [PaypalWebhookService, OrdersService, PaymentService],
})
export class WebhooksModule {}
