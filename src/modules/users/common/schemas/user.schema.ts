import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { required } from 'joi';
import { Document, Types } from 'mongoose';
import * as mongoosePaginate from 'mongoose-paginate-v2';
export type UserDocument = User & Document;

export enum UserRole {
  CLIENT = 'client',
  HANDYMAN = 'handyman',
  ADMIN = 'admin',
}

@Schema({ timestamps: true })
export class User {
  @Prop({ unique: true, required: true })
  googleId: string;

  @Prop({ required: true })
  name: string;

  @Prop({ required: true })
  lastName: string;

  @Prop({ required: true })
  profilePicture: string;

  @Prop({ unique: true, required: true })
  email: string;

  @Prop({ type: String, required: false })
  phone?: string;

  @Prop({ enum: UserRole, required: true })
  role: UserRole;

  @Prop()
  municipality: string;

  @Prop()
  neighborhood: string;

  @Prop({ type: Boolean, default: false })
  isBanned: boolean; //

  @Prop({ default: 0 })
  tokenVersion: number;

  @Prop()
  address: string;

  @Prop()
  source: string;

  @Prop()
  personalDescription?: string; // Solo para handyman

  @Prop({ type: [{ type: Types.ObjectId, ref: 'Skill' }], default: undefined })
  skills?: Types.ObjectId[]; // Solo handyman

  @Prop({ type: [{ type: Types.ObjectId, ref: 'Skill' }], default: undefined })
  preferences?: Types.ObjectId[]; // Solo cliente

  @Prop({ type: [String], default: undefined })
  coverageArea?: string[]; // Solo handyman

  @Prop({
    type: Number,
    default: function () {
      return this.role === 'handyman' ? 0 : undefined; // Solo handyman tiene rating por defecto
    },
    min: 0,
    max: 5,
  })
  rating?: number;
}
const UserSchema = SchemaFactory.createForClass(User);
UserSchema.plugin(mongoosePaginate);
export { UserSchema };
