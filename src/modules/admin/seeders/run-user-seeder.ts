import { NestFactory } from '@nestjs/core';
import { AppModule } from '../../../app.module';
import { UserSeeder } from './user-seeder';

async function bootstrap() {
  const app = await NestFactory.createApplicationContext(AppModule); // Inicializa la aplicación
  const userSeeder = app.get(UserSeeder); // Obtiene el seeder

  console.log('Running User Seeder...');
  await userSeeder.seedUsers(); // Llama al método seedUsers
  console.log('User Seeder completed.');

  await app.close(); // Cierra la aplicación
}

bootstrap();