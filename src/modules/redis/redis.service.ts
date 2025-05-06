import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { createClient, RedisClientType } from 'redis';
import { ConfigService } from '@nestjs/config';
@Injectable()
export class RedisService implements OnModuleInit, OnModuleDestroy {
  private client: RedisClientType;
  constructor(private readonly configService: ConfigService) {}
  async onModuleInit() {
    const host = this.configService.get<string>('REDIS_HOST');
    // const portStr = this.configService.get<string>('REDIS_PORT');
    // const port = Number(portStr);

    this.client = createClient({
      socket: {
        host,
        port: 13787,
      },
      username: process.env.REDIS_USERNAME,
      password: process.env.REDIS_PASSWORD,
    });

    this.client.on('error', (err) => console.error('Redis Client Error', err));
    await this.client.connect();
  }

  async onModuleDestroy() {
    if (this.client) {
      await this.client.disconnect();
    }
  }

  async set(key: string, value: string): Promise<void> {
    await this.client.set(key, value);
  }

  async get(key: string): Promise<string | null> {
    return this.client.get(key);
  }

  getClient(): RedisClientType {
    return this.client;
  }
}
