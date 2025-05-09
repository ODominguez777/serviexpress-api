import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ReportUser, ReportUserSchema } from './schemas/report-user.schema';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: ReportUser.name, schema: ReportUserSchema }]),
  ],
  exports: [MongooseModule], // Exporta MongooseModule para que otros módulos puedan usarlo
})
export class ReportsModule {}