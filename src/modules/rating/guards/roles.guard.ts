import { CanActivate, ExecutionContext, Injectable, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    // Obtener los roles permitidos desde los metadatos
    const requiredRoles = this.reflector.get<string[]>('roles', context.getHandler());
    if (!requiredRoles) {
      return true; // Si no hay roles definidos, permitir el acceso
    }

    const request = context.switchToHttp().getRequest();
    const user = request.user;

    // Verificar si el usuario tiene uno de los roles permitidos
    if (!user || !requiredRoles.includes(user.role)) {
      throw new ForbiddenException('Access denied: You do not have the required role');
    }

    return true; // Permitir acceso si el rol es válido
  }
}