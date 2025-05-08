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
import { ConfigModule, ConfigService } from '@nestjs/config';
import { PayoutService } from '../../payouts/payout.service';
import { SendgridService } from 'src/modules/sendgrid/sendgrid.service';

@Controller('webhooks/paypal')
export class PaypalWebhookController {
  constructor(
    private readonly paypalWebhookService: PaypalWebhookService,
    private readonly configService: ConfigService,
    private readonly payoutService: PayoutService,
    private readonly sendgridService: SendgridService,
  ) {}

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
    const headers = req.headers;
    const event = req.body;
    console.log('LLEGO  AL WEBHOOK', Date.now());

    const rawBody = (req as any).body;
    // PayPal requiere el rawBody para la firma, pero el campo webhook_event debe ser JSON
    let webhookEvent: any;
    try {
      webhookEvent = JSON.parse(rawBody.toString('utf8'));
    } catch (e) {
      return res.status(HttpStatus.BAD_REQUEST).send('Invalid JSON');
    }

    console.log('ATENCIOOOOOOOOOON', webhookEvent);
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
    console.log('Confirmo la firma', Date.now());
    // Manejo del evento
    if (webhookEvent.event_type === 'PAYMENT.CAPTURE.COMPLETED') {
      console.log(webhookEvent, 'webhookEvent');
      this.paypalWebhookService
        .handleCaptureCompleted(webhookEvent)
        .catch((err) => {
          // Loguear errores, notificar si es necesario, pero no interrumpir el webhook
          console.error('Error manejando webhook async:', err);
        });
    }

    if (webhookEvent.event_type === 'PAYMENT.PAYOUTS-ITEM.UNCLAIMED') {
      console.log('Payout no reclamado', webhookEvent);
      const receiver = webhookEvent.event.resource.payout_item.receiver;
      console.log('Payout no reclamado para el receptor:', receiver);
      console.log('evento:', event);
      const updateDto = {
        payoutItemId: webhookEvent.event.resource.payout_item_id,
        transactionId: webhookEvent.event.resource.transaction_id,
        status: webhookEvent.event.resource.transaction_status,
        transactionErrors: webhookEvent.event.resource.errors,
        paypalFeeOnPayout: webhookEvent.event.resource.payout_item_fee.value,
      };
      const updatePayout = this.payoutService.updatePayout(
        webhookEvent.event.resource.sender_batch_id,
        updateDto,
      );

      try {
        await this.sendgridService.sendMail({
          to: receiver,
          subject: '¡Acción requerida para recibir tu pago en ServiExpress!',
          html: `
            <div style="font-family: Arial, sans-serif; color: #222;">
              <h2>¡Hola!</h2>
              <p>
                Intentamos enviarte un pago por tu servicio completado en <b>ServiExpress</b>, pero tu correo <b>${receiver}</b> no está asociado a una cuenta PayPal.
              </p>
              <p>
                <b>¿Qué debes hacer?</b>
                <ul>
                  <li>Crea una cuenta PayPal usando este correo, o</li>
                  <li>Asocia este correo a tu cuenta PayPal existente.</li>
                </ul>
              </p>
              <p>
                <span style="color: #d9534f;"><b>Importante:</b></span> Si no reclamas el pago en 30 días, el dinero será devuelto al cliente.
              </p>
              <p>
                Si tienes dudas, contáctanos respondiendo a este correo.<br>
                <b>¡Gracias por usar ServiExpress!</b>
              </p>
            </div>
          `,
        });
      } catch (error) {
        console.error('Error enviando correo SendGrid:', error);
      }
    }

    if (webhookEvent.event_type === 'PAYMENT.PAYOUTS-ITEM.SUCCEEDED') {
      console.log('Payout exitoso', webhookEvent);
      const receiver = webhookEvent.event.resource.payout_item.receiver;
      console.log('Payout exitoso para el receptor:', receiver);
      const updateDto = {
        payoutItemId: webhookEvent.event.resource.payout_item_id,
        transactionId: webhookEvent.event.resource.transaction_id,
        status: webhookEvent.event.resource.transaction_status,
        transactionErrors: webhookEvent.event.resource.errors,
        paypalFeeOnPayout: webhookEvent.event.resource.payout_item_fee.value,
      };
      await this.payoutService.updatePayout(
        webhookEvent.event.resource.sender_batch_id,
        updateDto,
      );

      try {
        await this.sendgridService.sendMail({
          to: receiver,
          subject: '¡Has recibido tu pago en ServiExpress!',
          html: `
            <div style="font-family: Arial, sans-serif; color: #222;">
              <h2>¡Pago recibido!</h2>
              <p>
                <b>¡Felicidades!</b> Has recibido el pago correspondiente por tu servicio completado a través de <b>ServiExpress</b>.
              </p>
              <p>
                El monto ya está disponible en tu cuenta PayPal asociada a <b>${receiver}</b>.
              </p>
              <p>
                <span style="color: #28a745;"><b>¡Gracias por tu excelente trabajo y por confiar en nosotros!</b></span>
              </p>
              <p>
                Si tienes alguna duda o necesitas soporte, no dudes en responder a este correo.<br>
                <b>El equipo de ServiExpress</b>
              </p>
            </div>
          `,
        });
      } catch (error) {
        console.error('Error enviando correo SendGrid:', error);
      }
    }

    console.log('Se guardo to', Date.now());
    return res.status(HttpStatus.OK).send();
  }
}
