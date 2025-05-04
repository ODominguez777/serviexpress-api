import { Injectable, InternalServerErrorException } from '@nestjs/common';
import * as paypal from '@paypal/payouts-sdk';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class OrdersService {
  private client: paypal.core.PayPalHttpClient;

  constructor(private readonly configService: ConfigService) {
    const clientId = this.configService.get<string>('PAYPAL_CLIENT_ID');
    const clientSecret = this.configService.get<string>('PAYPAL_CLIENT_SECRET');
    const environment = new paypal.core.SandboxEnvironment(
      clientId,
      clientSecret,
    );
    this.client = new paypal.core.PayPalHttpClient(environment);
  }

  async createOrder(
    amount: number,
    quotationId: string,
    handymanEmail: string,
    currency = 'USD',
  ): Promise<string> {
    const request = new paypal.orders.OrdersCreateRequest();
    request.requestBody = {
      intent: 'CAPTURE',
      purchase_units: [
        {
          amount: {
            currency_code: currency,
            value: amount.toFixed(2),
          },
          custom_id: JSON.stringify({ quotationId, handymanEmail }),
        },
      ],
    };

    try {
      const response = await this.client.execute(request);
      return response.result.id;
    } catch (error) {
      throw new InternalServerErrorException('Error creando orden de PayPal');
    }
  }

  async captureOrder(orderId: string): Promise<any> {

    const request = new paypal.orders.OrdersCaptureRequest(orderId);
    request.requestBody({});

    try {
      const response = await this.client.execute(request);
      return response.result;
    } catch (error) {
      throw new InternalServerErrorException(
        'Error capturando orden de PayPal',
      );
    }
  }
}
