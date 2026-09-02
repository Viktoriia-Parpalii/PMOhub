import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { PrismaService } from "../../infrastructure/database/prisma.service";
import { AuthUser } from "../auth/auth-user";
import {
  ApplicationRole,
  PermissionName,
  PERMISSIONS_KEY,
  ROLES_KEY,
} from "../decorators/permissions.decorator";

@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly prisma: PrismaService,
  ) {}

  async canActivate(context: ExecutionContext) {
    const required = this.reflector.getAllAndOverride<PermissionName[]>(
      PERMISSIONS_KEY,
      [context.getHandler(), context.getClass()],
    );
    const requiredRoles = this.reflector.getAllAndOverride<ApplicationRole[]>(
      ROLES_KEY,
      [context.getHandler(), context.getClass()],
    );
    if (!required?.length && !requiredRoles?.length) return true;
    const user = context.switchToHttp().getRequest<{ user: AuthUser }>().user;
    if (requiredRoles?.length && !requiredRoles.includes(user.role)) {
      throw new ForbiddenException({
        success: false,
        code: "ROLE_FORBIDDEN",
        message: "Операція доступна лише для визначеної ролі",
      });
    }
    const permissions = await this.prisma.rolePermission.findUnique({
      where: { role: user.role },
      include: { roleDefinition: true },
    });
    if (
      required?.length &&
      (!permissions ||
        !permissions.roleDefinition.isActive ||
        permissions.isReadOnly ||
        !required.every((key) => permissions[key] === true))
    ) {
      throw new ForbiddenException({
        success: false,
        code: "FORBIDDEN",
        message: "Недостатньо прав",
      });
    }
    return true;
  }
}
