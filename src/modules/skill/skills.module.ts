import { forwardRef, Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { SkillService } from './skills.service';
import { SkillController } from './skills.controller';
import { Skill, SkillSchema } from './schemas/skill.schema';
import { UsersModule } from '../users/users.module';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: Skill.name, schema: SkillSchema }]),
    AuthModule,
    forwardRef(() => UsersModule),
  ],
  controllers: [SkillController],
  providers: [SkillService],
  exports: [SkillService, MongooseModule],
})
export class SkillModule {}
