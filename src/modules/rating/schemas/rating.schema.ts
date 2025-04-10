import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
export type RatingDocument = Rating & Document;
@Schema()
export class Rating extends Document {
  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  clientId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  handymanId: Types.ObjectId;

  @Prop({ type: Number, required: true, min: 1, max: 5 }) // Calificación entre 1 y 5
  rating: number;
}

export const RatingSchema = SchemaFactory.createForClass(Rating);