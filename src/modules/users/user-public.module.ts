// users/user-public.module.ts
import { forwardRef, Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { User, UserSchema } from './common/schemas/user.schema';
import { UsersService } from './common/users.service'; // O la ruta que uses para el service
import { AuthModule } from '../auth/auth.module';
import { Skill, SkillSchema } from '../skill/schemas/skill.schema';
import { Rating, RatingSchema } from '../rating/schemas/rating.schema';
import { ChatModule } from '../chat/chat.module';
import { RequestsModule } from '../requests/requests.module';
import { SkillModule } from '../skill/skills.module';
import { ReportUser, ReportUserSchema } from '../report/schemas/report-user.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: User.name, schema: UserSchema },
      { name: Skill.name, schema: SkillSchema },
      { name: Rating.name, schema: RatingSchema },
      { name: ReportUser.name, schema: ReportUserSchema }
    ]),
    forwardRef(() => AuthModule),
    ChatModule,
    forwardRef(() => RequestsModule),
    forwardRef(() => SkillModule),

  ],

  providers: [UsersService],
  exports: [UsersService],
})
export class UserPublicModule {}
