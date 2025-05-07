import { Controller, Post, Req } from '@nestjs/common';
import { PayoutService } from '../payouts/payout.service';
import { SendgridService } from '../sendgrid/sendgrid.service';
@Controller('payment')
export class PaymentController {
  constructor(
    private readonly payoutService: PayoutService,
    private readonly sendgridService: SendgridService,
  ) {}
  @Post('webhook/paypal')
  async handlePaypalWebhook(@Req() req) {
    const event = req.body;

    // Ejemplo: detectar payout no reclamado
    if (event.event_type === 'PAYMENT.PAYOUTS-ITEM.UNCLAIMED') {
      const receiver = event.resource.payout_item.receiver;
      console.log('Payout no reclamado para el receptor:', receiver);
      console.log('evento:', event);
      const updateDto = {
        payoutItemId: event.resource.payout_item_id,
        transactionId: event.resource.transaction_id,
        status: event.resource.transaction_status,
        transactionErrors: event.resource.errors,
        paypalFeeOnPayout: event.resource.payout_item_fee.value,
      };
      const updatePayout = this.payoutService.updatePayout(
        event.resource.sender_batch_id,
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

    return { received: true };
  }
}
