// src/webhooks/paypal/paypal-webhook.service.ts
import { Injectable, InternalServerErrorException } from '@nestjs/common';
import * as payouts from '@paypal/payouts-sdk';
import { VerifyWebhookSignatureRequest } from '@paypal/payouts-sdk';
import { PaymentService } from '../../payment/payment.service';
import { OrdersService } from '../../payment/paypal/order.service';
import axios from 'axios';
import { ConfigService } from '@nestjs/config';
import { config } from 'process';
import fetch from 'node-fetch';
import * as zlib from 'zlib';
import { ApiResponse } from 'src/modules/users/dto/response.dto';
import { Types } from 'mongoose';
@Injectable()
export class PaypalWebhookService {
  private payoutClient: payouts.core.PayPalHttpClient;

  constructor(
    private readonly paymentService: PaymentService,
    private readonly ordersService: OrdersService,
    private readonly configService: ConfigService,
  ) {
    const clientId = process.env.PAYPAL_CLIENT_ID;
    const clientSecret = process.env.PAYPAL_CLIENT_SECRET;

    // Cliente para payouts y webhooks
    const payoutEnv = new payouts.core.SandboxEnvironment(
      clientId,
      clientSecret,
    );
    this.payoutClient = new payouts.core.PayPalHttpClient(payoutEnv);
  }
  private async getAccessToken(): Promise<string> {
    const clientId = this.configService.get<string>('PAYPAL_CLIENT_ID')!;
    const clientSecret = this.configService.get<string>(
      'PAYPAL_CLIENT_SECRET',
    )!;
    const auth = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');

    let resp: any;
    try {
      resp = await axios.post(
        'https://api-m.sandbox.paypal.com/v1/oauth2/token',
        'grant_type=client_credentials',
        {
          headers: {
            Authorization: `Basic ${auth}`,
            'Content-Type': 'application/x-www-form-urlencoded',
          },
        },
      );
    } catch (error) {
      console.error('Error obteniendo token de acceso de PayPal:', error);
    }

    return resp.data.access_token;
  }

  /** Verifica firma del webhook */
  async verifySignature(opts: {
    transmissionId: string;
    transmissionTime: string;
    certUrl: string;
    authAlgo: string;
    transmissionSig: string;
    webhookEvent: any;
  }): Promise<any> {
    const token = await this.getAccessToken();
    const webhookId = this.configService.get<string>('PAYPAL_WEBHOOK_ID')!;
    const body = {
      auth_algo: opts.authAlgo,
      cert_url: opts.certUrl,
      transmission_id: opts.transmissionId,
      transmission_sig: opts.transmissionSig,
      transmission_time: opts.transmissionTime,
      webhook_id: webhookId,
      webhook_event:
        typeof opts.webhookEvent === 'string'
          ? JSON.parse(opts.webhookEvent)
          : opts.webhookEvent,
    };

    try {
      const resp = await fetch(
        'https://api-m.sandbox.paypal.com/v1/notifications/verify-webhook-signature',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(body),
        },
      );
      const respuesta = await resp.json();
      if (respuesta.verification_status === 'SUCCESS') {
        return true;
      } else {
        console.error(
          'Error al verificar la firma. Status:',
          respuesta.verification_status,
        );
        return false;
      }
    } catch (err) {
      console.error(
        'Error verificando firma de webhook:',
        err.response?.data || err.message,
      );
      throw new InternalServerErrorException(
        'Error verificando firma de webhook',
      );
    }
  }

  /** Maneja el evento PAYMENT.CAPTURE.COMPLETED */
  async handleCaptureCompleted(event: any): Promise<any> {
    const capture = event.resource;
    const netAmount = capture.seller_receivable_breakdown.net_amount.value;
    const currencyCode =
      capture.seller_receivable_breakdown.gross_amount.currency_code;
    const status = capture.status;
    const savePayment = await this.paymentService.savePayment(
      capture.custom_id as Types.ObjectId,
      netAmount as number,
      currencyCode as string,
      event.id as string,
      capture.id as string,
      status as string,
    );
    if (!savePayment.success) {
      if (savePayment.message === 'Payment already registered') {
        throw new Error('Payment already registered');
      }
      throw new Error(savePayment.message);
    }
  }
}
