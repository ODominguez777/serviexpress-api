import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { SkillService } from './skills.service';
import { SkillController } from './skills.controller';
import { Skill, SkillSchema } from './schemas/skill.schema';

@Module({
  imports: [MongooseModule.forFeature([{ name: Skill.name, schema: SkillSchema }])],
  controllers: [SkillController],
  providers: [SkillService],
  exports: [SkillService, MongooseModule], 
})
export class SkillModule {}
