import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { I18nService } from 'nestjs-i18n';
import { ROLES_KEY } from '../decorators/roles.decorator';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(
    private reflector: Reflector,
    private readonly i18n: I18nService,
  ) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<string[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    // Nếu Route không khai báo @Roles() thì cho qua
    if (!requiredRoles) {
      return true;
    }

    const { user } = context.switchToHttp().getRequest();
    if (!user || !user.roles) {
      throw new ForbiddenException(this.i18n.t('auth.error.forbidden_resource'));
    }

    // Kiểm tra xem User có ít nhất 1 Role phù hợp không
    const hasRole = user.roles.some((role: string) => requiredRoles.includes(role));
    if (!hasRole) {
      throw new ForbiddenException(this.i18n.t('auth.error.insufficient_role'));
    }

    return true;
  }
}