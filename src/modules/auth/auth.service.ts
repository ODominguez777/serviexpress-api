import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { UsersService } from '../users/common/users.service';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import * as jwt from 'jsonwebtoken';
import e from 'express';
@Injectable()
export class AuthService {
  private readonly jwtSecret: string;

  constructor(
    private readonly userService: UsersService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {
    const secret = this.configService.get<string>('JWT_SECRET');
    if (!secret) {
      throw new Error('JWT_SECRET is not defined in the configuration');
    }
    this.jwtSecret = secret;
  }

  async validateUser(email: string, googleId: string): Promise<any> {
    const user = await this.userService.getUsersForAuth(email);
    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    if(user.isBanned){
      throw new UnauthorizedException('User is banned');
    }
    const isPasswordValid = await bcrypt.compare(googleId, user.googleId);
    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    return user;
  }

  validateToken(token: string): any {
    try {
      return this.jwtService.verify(token);
    } catch (error) {
      throw new Error('Invalid token');
    }
  }
  
  async login(user: any) {
    const payload = { sub: user._id, role: user.role, email: user.email };
    return {
      access_token: this.jwtService.sign(payload),
    };
  }
}
