import { Module } from '@nestjs/common';
import { AdminService } from './admin.service';
import { AdminController } from './admin.controller';
import { MongooseModule } from '@nestjs/mongoose';
import { User, UserSchema } from '../users/common/schemas/user.schema'; // Asegúrate de que la ruta sea correcta
import { AuthModule } from '../auth/auth.module';
import { Skill, SkillSchema } from '../skill/schemas/skill.schema';
import { UserSeeder } from './seeders/user-seeder';
import { UsersService } from '../users/common/users.service';
import { Rating, RatingSchema } from '../rating/schemas/rating.schema';
import { ChatModule } from '../chat/chat.module';
import { RequestsModule } from '../requests/requests.module';
import { SkillModule } from '../skill/skills.module';
import {
  ReportUser,
  ReportUserSchema,
} from '../report/schemas/report-user.schema';
@Module({
  imports: [
    MongooseModule.forFeature([
      { name: User.name, schema: UserSchema },
      { name: Skill.name, schema: SkillSchema },
      { name: Rating.name, schema: RatingSchema },
      { name: ReportUser.name, schema: ReportUserSchema }, // Asegúrate de que la ruta sea correcta
    ]),
    AuthModule,
    ChatModule,
    RequestsModule,
    SkillModule,
  ],

  controllers: [AdminController],
  providers: [AdminService, UserSeeder, UsersService], // Registrar el guard aquí
})
export class AdminModule {}
