import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { UsersService } from '../users/common/users.service';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { ChatService } from '../chat/chat.service';

@Injectable()
export class AuthService {
  private readonly jwtSecret: string;

  constructor(
    private readonly userService: UsersService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly chatService: ChatService,
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

    if (user.isBanned) {
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
      if (error.message === 'jwt expired') {
        throw new UnauthorizedException('Token expired, please log in again');
      } else if (
        error.message === 'invalid token' ||
        error.message === 'jwt malformed'
      ) {
        throw new UnauthorizedException('Invalid token signature');
      } else {
        throw new UnauthorizedException('Authentication failed');
      }
    }
  }

  async login(user: any) {
    const payload = {
      sub: user._id,
      role: user.role,
      email: user.email,
      tokenVersion: user.tokenVersion,
    };

    await this.chatService.upsertUser(user._id.toString(), user.name, user.email);
    const chatToken = await this.chatService.generateUserToken(user._id.toString());
    const refreshToken = crypto.randomBytes(32).toString('hex');
    await this.userService.updateRefreshToken(user._id, refreshToken);

    return {
      accessToken: this.jwtService.sign(payload),
      refresh_token: refreshToken,
      chatToken,
    };
  }

  async refreshAccessToken(
    refreshToken: RefreshTokenDto,
  ): Promise<{ access_token: string }> {
    const user = await this.userService.findOneByRefreshToken(
      refreshToken.refreshToken,
    );

    if (!user) {
      throw new UnauthorizedException('Invalid refresh token');
    }

    const payload = {
      sub: user._id,
      role: user.role,
      email: user.email,
      tokenVersion: user.tokenVersion,
    };
    const accessToken = this.jwtService.sign(payload);

    return { access_token: accessToken };
  }
}
