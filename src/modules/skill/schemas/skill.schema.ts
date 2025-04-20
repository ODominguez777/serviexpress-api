import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
export type SkillDocument = Skill & Document;

@Schema({ timestamps: true })
export class Skill {
  @Prop({ required: true, unique: true })
  skillName: string;

  @Prop()
  description: string;
}
const SkillSchema = SchemaFactory.createForClass(Skill);
export { SkillSchema };
