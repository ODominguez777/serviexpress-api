import { forwardRef, Module } from '@nestjs/common';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { JwtStrategy } from './jwt.strategy';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { UserPublicModule } from '../users/user-public.module';

@Module({
  imports: [ // Permite la referencia circular entre módulos
    PassportModule,
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: async (configService: ConfigService) => ({
        secret: configService.get<string>('JWT_SECRET'),
        signOptions: { expiresIn: '1d' }, // Token válido por 7 días
      }),
    }),
    forwardRef(()=>UserPublicModule), // Importa el módulo de usuarios públicos para poder usar el servicio de usuarios
  ],
  providers: [AuthService, JwtStrategy],
  controllers: [AuthController],
  exports: [AuthService, JwtStrategy], // Exporta AuthService para que pueda ser utilizado en otros módulos
})
export class AuthModule {}
