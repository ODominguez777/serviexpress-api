import { forwardRef, Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { SkillService } from './skills.service';
import { SkillController } from './skills.controller';
import { Skill, SkillSchema } from './schemas/skill.schema';
import { AuthModule } from '../auth/auth.module';
import { UserPublicModule } from '../users/user-public.module';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: Skill.name, schema: SkillSchema }]),
    forwardRef(()=>AuthModule),
    forwardRef(() => UserPublicModule),
  ],
  controllers: [SkillController],
  providers: [SkillService],
  exports: [SkillService, MongooseModule],
})
export class SkillModule {}
