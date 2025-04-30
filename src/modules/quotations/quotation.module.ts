import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Quotation, QuotationSchema } from './schemas/quotation.schema';
import { Skill, SkillSchema } from '../skill/schemas/skill.schema';
import { User, UserSchema } from '../users/common/schemas/user.schema';
import { SkillModule } from '../skill/skills.module';
import { AuthModule } from '../auth/auth.module';
import { UsersModule } from '../users/users.module';
import { ChatModule } from '../chat/chat.module';
import { CHAT_ADAPTER } from '../chat/chat.constants';
import { QuotationController } from './quotation.controller';
import { QuotationService } from './quotation.service';
import { RequestsModule } from '../requests/requests.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      {name:Quotation.name, schema:QuotationSchema},
      { name: Skill.name, schema: SkillSchema },
      { name: User.name, schema: UserSchema },
    ]),
    RequestsModule,
    SkillModule,
    AuthModule,
    UsersModule,
    ChatModule
  ],
  controllers: [QuotationController],
  providers: [QuotationService, {provide: 'chatAdapter', useExisting: CHAT_ADAPTER}],
  exports: [QuotationService],
})
export class QuotationModule {}
