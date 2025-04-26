import { Module } from '@nestjs/common';
import { ChatService } from './chat.service';
import { CHAT_ADAPTER } from './chat.constants';

@Module({
  providers: [{ provide: CHAT_ADAPTER, useClass: ChatService }, ChatService],
  exports: [ChatService, CHAT_ADAPTER],
})
export class ChatModule {}
