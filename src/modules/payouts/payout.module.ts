import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Payout, PayoutSchema } from './schemas/payout.schema';
import { PayoutService } from './payout.service';
import { PayoutController } from './payout.controller';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: Payout.name, schema: PayoutSchema }]),
  ],
  providers: [PayoutService],
  controllers: [PayoutController],
  exports: [PayoutService, MongooseModule],
})
export class PayoutModule {}