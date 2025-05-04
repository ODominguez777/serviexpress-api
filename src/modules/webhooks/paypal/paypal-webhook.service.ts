// src/webhooks/paypal/paypal-webhook.service.ts
import { Injectable, InternalServerErrorException } from '@nestjs/common';
import * as payouts from '@paypal/payouts-sdk';
import { notifications } from '@paypal/payouts-sdk';
import { PaymentService } from '../../payment/payment.service';
import { OrdersService } from '../../payment/paypal/order.service';

@Injectable()
export class PaypalWebhookService {
  private payoutClient: payouts.core.PayPalHttpClient;

  constructor(
    private readonly paymentService: PaymentService,
    private readonly ordersService: OrdersService,
  ) {
    const clientId = process.env.PAYPAL_CLIENT_ID;
    const clientSecret = process.env.PAYPAL_CLIENT_SECRET;

    // Cliente para payouts y webhooks
    const payoutEnv = new payouts.core.SandboxEnvironment(clientId, clientSecret);
    this.payoutClient = new payouts.core.PayPalHttpClient(payoutEnv);
  }

  /** Verifica firma del webhook */
  async verifySignature(opts: {
    transmissionId: string;
    transmissionTime: string;
    certUrl: string;
    authAlgo: string;
    transmissionSig: string;
    webhookEvent: any;
  }): Promise<boolean> {
    const request = new notifications.VerifyWebhookSignatureRequest();
    request.requestBody({
      auth_algo: opts.authAlgo,
      cert_url: opts.certUrl,
      transmission_id: opts.transmissionId,
      transmission_sig: opts.transmissionSig,
      transmission_time: opts.transmissionTime,
      webhook_id: process.env.PAYPAL_WEBHOOK_ID,
      webhook_event: opts.webhookEvent,
    });
    try {
      const response = await this.payoutClient.execute(request);
      return response.result.verification_status === 'SUCCESS';
    } catch (err) {
      throw new InternalServerErrorException(
        'Webhook signature verification failed',
      );
    }
  }

  /** Maneja el evento PAYMENT.CAPTURE.COMPLETED */
  async handleCaptureCompleted(event: any) {
    const capture = event.resource;
    const orderId = capture.supplementary_data.related_ids.order_id;

    // 1) Recupera la orden completa si necesitas más detalles
    const orderData = await this.ordersService.captureOrder(orderId);

    // 2) Guarda el pago en MongoDB
    //    Necesitas el quotationId y handymanEmail;
    //    puedes enviarlos en metadata al crear la orden
    const { quotationId, handymanEmail } = JSON.parse(
      orderData.purchase_units[0].custom_id,
    );
    await this.paymentService.recordPayment(orderData);

    // 3) (Opcional) Dispara el payout automático si usas Payouts API
    // await this.paymentService.handlePaymentCapture({ amount: +capture.amount.value, handymanEmail, quotationId });
  }
}
