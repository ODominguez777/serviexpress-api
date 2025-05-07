export class CreatePayoutDto {
  handymanId?: string;
  requestId?: string;
  requestTitle?: string;
  batchId?: string;
  quotationId?: string;
  clientPaymentAmount?: number;
  paypalFeeOnClientPayment?: number;
  appCommission?: number;
  amountSentToHandyman?: number;
  paypalFeeOnPayout?: number;
  handymanNetAmount?: number;
  currency?: string;
  payoutBatchId?: string;
  payoutItemId?: string;
  transactionId?: string;
  status?: string;
  transactionErrors?: any;
  senderBatchId?: string;
}