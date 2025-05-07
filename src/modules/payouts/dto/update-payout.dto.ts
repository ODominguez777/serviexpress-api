export class UpdatePayoutDto {
    paypalFeeOnPayout: number;
    payoutItemId: string;
    transactionId: string;
    status: string;
    transactionErrors: any;
  }