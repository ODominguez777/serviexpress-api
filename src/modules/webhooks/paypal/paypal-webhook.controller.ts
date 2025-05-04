// src/webhooks/paypal/webhook.controller.ts
import { Controller, Post, Req, Res, Headers, HttpStatus } from '@nestjs/common';
import { Request, Response } from 'express';
import { PaypalWebhookService } from './paypal-webhook.service';

@Controller('webhooks/paypal')
export class PaypalWebhookController {
  constructor(private readonly webhookService: PaypalWebhookService) {}

  @Post()
  async handleEvent(
    @Req()     req: Request,
    @Res()     res: Response,
    @Headers('paypal-transmission-id') transId: string,
    @Headers('paypal-transmission-sig')  transSig: string,
    @Headers('paypal-transmission-time') transTime: string,
    @Headers('paypal-cert-url')          certUrl: string,
    @Headers('paypal-auth-algo')         authAlgo: string,
  ) {
    // 1) Validar firma del webhook
    const isValid = await this.webhookService.verifySignature({
      transmissionId: transId,
      transmissionTime: transTime,
      certUrl,
      authAlgo,
      transmissionSig: transSig,
      webhookEvent: req.body,
    });
    if (!isValid) {
      return res.status(HttpStatus.BAD_REQUEST).send('Invalid signature');
    }

    // 2) Procesar el evento
    const eventType = req.body.event_type;
    switch (eventType) {
      case 'PAYMENT.CAPTURE.COMPLETED':
        await this.webhookService.handleCaptureCompleted(req.body);
        break;
      // puedes manejar otros eventos si lo deseas
      default:
        break;
    }

    res.sendStatus(HttpStatus.OK);
  }
}
