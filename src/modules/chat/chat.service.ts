import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { StreamChat } from 'stream-chat';

@Injectable()
export class ChatService {
  private readonly chatClient: StreamChat;

  constructor(private readonly configService: ConfigService) {
    const apiKey = this.configService.get<string>('STREAM_API_KEY');
    const apiSecret = this.configService.get<string>('STREAM_API_SECRET');
    if (!apiKey || !apiSecret) {
      throw new Error(
        'STREAM_API_KEY and STREAM_API_SECRET must be defined in the environment variables',
      );
    }

    this.chatClient = StreamChat.getInstance(apiKey, apiSecret);
  }

  async createChannel(channelId: string, members: string[], createdById: string): Promise<any> {
    const channel = this.chatClient.channel('messaging', channelId, {
      members,
      created_by_id: createdById, // Especificar quién crea el canal
    });
    await channel.create();
    return channel;
  }

  async sendMessage(
    channelId: string,
    userId: string,
    text: string,
  ): Promise<any> {
    const channel = this.chatClient.channel('messaging', channelId);
    const message = await channel.sendMessage({
      text,
      user_id: userId,
    });
    return message;
  }

  async upsertUser(userId: string, name: string, email: string): Promise<any> {
    console.log('upsertUser', userId, name, email);

    if (!userId || typeof userId !== 'string') {
      throw new Error('Invalid userId');
    }

    if (!name || typeof name !== 'string') {
      throw new Error('Invalid name');
    }

    if (!email || typeof email !== 'string' || !email.includes('@')) {
      throw new Error('Invalid email');
    }

    try {
      const user = {
        id: userId, // ID único del usuario
        name, // Nombre del usuario
        email, // Email del usuario
      };

      // Crear o actualizar el usuario en GetStream.io
      console.log('Calling GetStream upsertUser...');
      console.log('user 1', user);
      await this.chatClient
        .upsertUser(user)
        .then((res) => {
          console.log('Usuario creado en GetStream:', res);
        })
        .catch((err) => {
          console.error('Error al crear el usuario en GetStream:', err);
          console.log('user 2', user);
        });
      return user;
    } catch (error) {
      console.error('Error creating/updating user in GetStream:', error);
      throw new Error('Failed to create or update user in GetStream');
    }
  }

  async generateUserToken(userId: string): Promise<string> {
    return this.chatClient.createToken(userId);
  }
}
