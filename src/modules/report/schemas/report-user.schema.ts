import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

@Schema({ timestamps: true })
export class ReportUser {
  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  reporterUserId: Types.ObjectId; // Usuario que crea el reporte

  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  reportedUserId: Types.ObjectId; // Usuario reportado

  @Prop({ type: String, required: true })
  title: string; // Título del reporte

  @Prop({ type: String, required: true })
  description: string; // Descripción del reporte

  @Prop({ type: Date, default: Date.now })
  createdAt: Date; // Fecha de creación (timestamps lo maneja automáticamente)

  @Prop({ type: String, required: true, enum: ['client', 'handyman', ] })
  reporterRole: string; // Rol del usuario que crea el reporte
}

export type ReportUserDocument = ReportUser & Document;
export const ReportUserSchema = SchemaFactory.createForClass(ReportUser);
