import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
} from '@nestjs/common';
import { AuthService } from './auth.service';
import { UsersService } from '../users/common/users.service';

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    private readonly authService: AuthService,
    private readonly userService: UsersService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const authHeader = request.headers['authorization'];
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new UnauthorizedException('Authorization header is missing');
    }
    const token = authHeader.split(' ')[1];

    try {
      const decoded = await this.authService.validateToken(token);

      const user = await this.userService.findById(decoded.sub);
      if (user.isBanned) {
        throw new UnauthorizedException('User is banned');
      }
      request.user = decoded;
      return true;
    } catch (error) {
      throw new UnauthorizedException(error.message);
    }
  }
}
