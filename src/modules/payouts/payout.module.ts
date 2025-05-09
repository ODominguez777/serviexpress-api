import { forwardRef, Module } from '@nestjs/common';
import { PayoutController } from './payout.controller';
import { PayoutService } from './payout.service';
import { MongooseModule } from '@nestjs/mongoose';
import { Payout, PayoutSchema } from './schemas/payout.schema';
import { AuthModule } from '../auth/auth.module'; // <-- Importa tu AuthModule
import { UsersModule } from '../users/users.module';
import { RequestsModule } from '../requests/requests.module';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: Payout.name, schema: PayoutSchema }]),
    forwardRef(() => AuthModule),
    forwardRef(() => UsersModule),
    forwardRef(() => RequestsModule), // <-- Importa tu RequestsModule si es necesario
  ],
  controllers: [PayoutController],
  providers: [PayoutService],
  exports: [PayoutService],
})
export class PayoutModule {}
