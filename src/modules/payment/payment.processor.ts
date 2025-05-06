import { Processor, Process } from '@nestjs/bull';
import { Job } from 'bull';
import { PaymentService } from './payment.service';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Quotation } from '../quotations/schemas/quotation.schema';
import { Request } from '../requests/schemas/request.schema';
import { ChatService } from '../chat/chat.service';
import { QuotationStatus } from '../quotations/schemas/quotation.schema';
import { RequestStatus } from '../requests/schemas/request.schema';

@Processor('payment')
export class PaymentProcessor {
  constructor(
    private readonly paymentService: PaymentService,
    private readonly chat: ChatService,
    @InjectModel('Quotation') private readonly quotation: Model<Quotation>,
    @InjectModel('Request') private readonly requestModel: Model<Request>,
  ) {}

  @Process('capture-completed')
  async handlePayment(job: Job<any>) {
    const { event, adminId } = job.data;
    const capture = event.resource;
    const quotationId = capture.custom_id;
    const netAmount = capture.seller_receivable_breakdown.net_amount.value;
    const currencyCode =
      capture.seller_receivable_breakdown.gross_amount.currency_code;
    const status = capture.status;

    const saveResult = await this.paymentService.savePayment(
      quotationId,
      netAmount,
      currencyCode,
      event.id,
      capture.id,
      status,
    );
    if (!saveResult.success) {
      if (saveResult.message === 'Payment already registered') return;
      console.error('Error saving payment:', saveResult.message);
      throw new Error(saveResult.message);
    }

    const quotation = await this.quotation.findById(quotationId);
    if (!quotation) throw new Error('Quotation not found');

    const request = await this.requestModel.findById(quotation.requestId);
    if (!request) throw new Error('Request not found');

    request.status = RequestStatus.PAYED;
    quotation.status = QuotationStatus.PAYED;

    const channelId = `request-${request._id}`;
    const message = `<strong>El pago de la solicitud:<strong/> ${request.title} ha sido confirmado.`;

    await this.chat.updateMetadataChannel(channelId, {
      requestStatus: RequestStatus.PAYED,
    });
    console.log('Se actualizo la metadata', Date.now());

    await Promise.all([
      request.save(),
      quotation.save(),
      this.chat.sendMessage(channelId, adminId, message),
    ]);

    console.log(
      'Se guardó el pago y se actualizó la solicitud y la cotización',
      Date.now(),
    );
  }
}
