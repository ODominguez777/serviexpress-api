import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { required } from 'joi';
import { Document, Types } from 'mongoose';
import * as mongoosePaginate from 'mongoose-paginate-v2';
export type UserDocument = User & Document;

enum UserRole {
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

  @Prop()
  phone: string;

  @Prop({ enum: UserRole, required: true })
  role: UserRole;

  @Prop()
  municipality: string;

  @Prop()
  neighborhood: string;

  @Prop()
  address: string;

  @Prop()
  source: string;

  @Prop()
  personalDescription?: string; // Solo para handyman

  @Prop({ type: [{ type: Types.ObjectId, ref: 'Skill' }] })
  skills?: Types.ObjectId[]; // Solo handyman

  @Prop({ type: [{ type: Types.ObjectId, ref: 'Skill' }] })
  preferences?: Types.ObjectId[]; // Solo cliente

  @Prop([String])
  coverageArea?: string[]; // Solo handyman

  @Prop()
  rating?: number; // Solo handyman
}
const UserSchema = SchemaFactory.createForClass(User);
UserSchema.plugin(mongoosePaginate);
export { UserSchema };
