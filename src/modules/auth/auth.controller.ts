import { Controller, Post, Body, UnauthorizedException } from '@nestjs/common';
import { AuthService } from './auth.service';
import { UsersService } from '../users/common/users.service';
import { LoginDto } from './dto/login.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';

@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly userService: UsersService,
  ) {}

  @Post('login')
  async login(@Body() loginDto: LoginDto) {
    const user = await this.authService.validateUser(
      loginDto.email,
      loginDto.googleId,
    );
    return this.authService.login(user);
  }

  @Post('refresh-token')
  async refreshToken(@Body() refreshToken: RefreshTokenDto) {
    if (!refreshToken) {
      throw new UnauthorizedException('Refresh token is required');
    }

    return this.authService.refreshAccessToken(refreshToken);
  }
}
