// src/modules/webhooks/paypal/paypal-webhook.controller.ts
import {
  Controller,
  Headers,
  Post,
  Req,
  Res,
  HttpStatus,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { PaypalWebhookService } from './paypal-webhook.service';

@Controller('webhooks/paypal')
export class PaypalWebhookController {
  constructor(private readonly paypalWebhookService: PaypalWebhookService) {}

  @Post()
  async handleWebhook(
    @Headers('paypal-transmission-id') transmissionId: string,
    @Headers('paypal-transmission-time') transmissionTime: string,
    @Headers('paypal-cert-url') certUrl: string,
    @Headers('paypal-auth-algo') authAlgo: string,
    @Headers('paypal-transmission-sig') transmissionSig: string,
    @Req() req: Request,
    @Res() res: Response,
  ) {



    const rawBody = (req as any).body;
    // PayPal requiere el rawBody para la firma, pero el campo webhook_event debe ser JSON
    let webhookEvent: any;
    try {
      webhookEvent = JSON.parse(rawBody.toString('utf8'));
    } catch (e) {
      return res.status(HttpStatus.BAD_REQUEST).send('Invalid JSON');
    }
    
    // Verificar firma
    const isValid = await this.paypalWebhookService.verifySignature({
      transmissionId,
      transmissionTime,
      certUrl,
      authAlgo,
      transmissionSig,
      webhookEvent: rawBody.toString('utf8'), // <-- ENVÍA EL STRING CRUDO
    });

    if (!isValid) {
      console.warn('[Webhook] Firma inválida');
      return res.status(HttpStatus.BAD_REQUEST).send('Invalid signature');
    }

    // Manejo del evento
    if (webhookEvent.event_type === 'PAYMENT.CAPTURE.COMPLETED') {
      this.paypalWebhookService.handleCaptureCompleted(webhookEvent)
      .catch((err) => {
        // Loguear errores, notificar si es necesario, pero no interrumpir el webhook
        console.error('Error manejando webhook async:', err);
      });
    }

    return res.status(HttpStatus.OK).send();
  }
}
