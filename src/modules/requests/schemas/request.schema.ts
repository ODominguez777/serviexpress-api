import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type RequestDocument = Request & Document;

export enum RequestStatus {
  PENDING = 'pending',
  ACCEPTED = 'accepted',
  PAYED = 'payed',
  IN_PROGRESS = 'in_progress',
  QUOTED = 'quoted',
  REJECTED = 'rejected',
  COMPLETED = 'completed',
  EXPIRED = 'expired',
  CANCELLED = 'cancelled',
}

@Schema({_id:false})
export class Location {
  @Prop({ type: String, required: true })
  municipality: string;

  @Prop({ type: String, required: true })
  neighborhood: string;

  @Prop({ type: String, required: true })
  address: string;
}

export const LocationSchema = SchemaFactory.createForClass(Location);

@Schema({ timestamps: true })
export class Request {
  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  clientId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  handymanId: Types.ObjectId;

  @Prop({ type: String, required: true })
  title: string;

  @Prop({ type: String, required: true })
  description: string;

  @Prop({ type: Date, required: true })
  expiresAt: Date;

  @Prop({ type: String, enum: RequestStatus, default: RequestStatus.PENDING })
  status: RequestStatus;

  @Prop({ type: LocationSchema, required: true })
  location: Location;

  @Prop({ type: String, required: false })
  channelId: string;

  @Prop({ type: [{ type: Types.ObjectId, ref: 'Skill' }], required: true })
  categories: Types.ObjectId[];
}

export const RequestSchema = SchemaFactory.createForClass(Request);