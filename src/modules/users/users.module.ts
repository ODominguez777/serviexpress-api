import { forwardRef, Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { UsersService } from './common/users.service';
import { UsersController } from './common/users.controller';
import { User, UserSchema } from './common/schemas/user.schema';
import { SkillModule } from '../skill/skills.module';
import { AuthModule } from '../auth/auth.module';
import { RatingModule } from '../rating/rating.module';
import { Skill, SkillSchema } from '../skill/schemas/skill.schema';
import { HandymenController } from './handymen/handymen.controller';
import { ClientsController } from './clients/clients.controller';
import { HandymenService } from './handymen/handymen.service';
import { ClientsService } from './clients/clients.service';
import { ChatModule } from '../chat/chat.module';
import { RequestsModule } from '../requests/requests.module';
import { ReportsModule } from '../report/report.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: User.name, schema: UserSchema },
      { name: Skill.name, schema: SkillSchema },
    ]),
    SkillModule,
    forwardRef(()=>RatingModule),

    forwardRef(() => AuthModule),
    forwardRef(()=>ChatModule),
    forwardRef(()=>RequestsModule),
    ReportsModule
  ],
  controllers: [UsersController, HandymenController, ClientsController],
  providers: [UsersService, HandymenService, ClientsService],
  exports: [UsersService],
})
export class UsersModule {}
