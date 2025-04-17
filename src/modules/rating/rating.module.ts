import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { RatingController } from './rating.controller';
import { RatingService } from './rating.service';
import { Rating, RatingSchema } from './schemas/rating.schema';
import { User, UserSchema } from '../users/common/schemas/user.schema';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Rating.name, schema: RatingSchema },
      { name: User.name, schema: UserSchema },
    ]),
    AuthModule
  ],
  controllers: [RatingController],
  providers: [RatingService],
  exports: [RatingService, MongooseModule], // Exportar el servicio si otros módulos lo necesitan
})
export class RatingModule {}