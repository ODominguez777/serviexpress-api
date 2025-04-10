import { forwardRef, Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { UsersService } from './users.service';
import { UsersController } from './users.controller';
import { User, UserSchema } from './schemas/user.schema';
import { SkillModule } from '../skill/skills.module';
import { AuthModule } from '../auth/auth.module';
import { RatingModule } from '../rating/rating.module';
import { Skill, SkillSchema } from '../skill/schemas/skill.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: User.name, schema: UserSchema },
      { name: Skill.name, schema: SkillSchema },
    ]),
    SkillModule,
    RatingModule,

    forwardRef(() => AuthModule), // Permite la referencia circular entre módulos
  ],
  controllers: [UsersController],
  providers: [UsersService],
  exports: [UsersService],
})
export class UsersModule {}
