import { forwardRef, Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Request, RequestSchema } from './schemas/request.schema';
import { RequestsService } from './requests.service';
import { RequestsController } from './requests.controller';
import { Skill, SkillSchema } from '../skill/schemas/skill.schema';
import { User, UserSchema } from '../users/common/schemas/user.schema';
import { SkillModule } from '../skill/skills.module';
import { AuthModule } from '../auth/auth.module';
import { UsersModule } from '../users/users.module';
import { ChatModule } from '../chat/chat.module';
import {
  Quotation,
  QuotationSchema,
} from '../quotations/schemas/quotation.schema';
import { CHAT_ADAPTER } from '../chat/chat.constants';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Request.name, schema: RequestSchema },
      { name: Quotation.name, schema: QuotationSchema },
      { name: Skill.name, schema: SkillSchema },
      { name: User.name, schema: UserSchema },
    ]),
    forwardRef(()=>SkillModule),
    forwardRef(()=>AuthModule),
    forwardRef(() => UsersModule),
    ChatModule,
  ],
  controllers: [RequestsController],
  providers: [
    RequestsService,
    { provide: 'chatAdapter', useExisting: CHAT_ADAPTER },
  ],
  exports: [RequestsService, MongooseModule],
})
export class RequestsModule {}
