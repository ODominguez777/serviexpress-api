// paypal.service.ts
import { Injectable } from '@nestjs/common';
import * as paypal from '@paypal/payouts-sdk';
import { ConfigService } from '@nestjs/config';
import { config } from 'process';
@Injectable()
export class PaypalService {
  private client;

  constructor(private readonly configService: ConfigService) {
    const clientId = configService.get<string>('PAYPAL_CLIENT_ID');
    const clientSecret = configService.get<string>('PAYPAL_CLIENT_SECRET');
    const environment = new paypal.core.SandboxEnvironment(
      clientId,
      clientSecret,
    );
    this.client = new paypal.core.PayPalHttpClient(environment);
  }

  async createPayout(senderBatchId: string, items: any[]) {
    const requestBody = {
      sender_batch_header: {
        sender_batch_id: senderBatchId,
        email_subject: 'You have a payout!',
        email_message: 'You have received a payout!',
      },
      items,
    };

    const request = new paypal.payouts.PayoutsPostRequest();
    request.requestBody(requestBody);

    try {
      const response = await this.client.execute(request);
      return response.result;
    } catch (error) {
      console.error('Error creating payout:', error);
      throw new Error('Error creating payout');
    }
  }

  async getPayoutStatus(payoutBatchId: string) {
    const request = new paypal.payouts.PayoutsGetRequest(payoutBatchId);
    try {
      const response = await this.client.execute(request);
      return response.result;
    } catch (error) {
      console.error('Error getting payout status:', error);
      throw new Error('Error getting payout status');
    }
  }
}
