import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { JwtService } from "@nestjs/jwt";
import { Reflector } from "@nestjs/core";
import { PrismaService } from "../../infrastructure/database/prisma.service";
import { IS_PUBLIC_KEY } from "../decorators/public.decorator";

@Injectable()
export class AccessTokenGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
    private readonly prisma: PrismaService,
  ) {}

  async canActivate(context: ExecutionContext) {
    if (
      this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
        context.getHandler(),
        context.getClass(),
      ])
    )
      return true;
    const request = context.switchToHttp().getRequest();
    const authorization = request.headers.authorization as string | undefined;
    const token = authorization?.startsWith("Bearer ")
      ? authorization.slice(7)
      : undefined;
    if (!token)
      throw new UnauthorizedException({
        success: false,
        code: "AUTH_REQUIRED",
        message: "Потрібна авторизація",
      });
    try {
      const payload = await this.jwt.verifyAsync<{
        sub: string;
        type: string;
        must_change_password?: boolean;
      }>(token, { secret: this.config.getOrThrow("JWT_ACCESS_SECRET") });
      if (payload.type !== "access") throw new Error("Invalid token type");
      const user = await this.prisma.user.findUnique({
        where: { id: payload.sub },
        include: { roleDefinition: true },
      });
      if (!user?.isActive || !user.roleDefinition.isActive)
        throw new Error("Inactive user or role");
      request.user = {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        department_id: user.departmentId ?? undefined,
        must_change_password: user.mustChangePassword,
        password_change_authorized:
          payload.must_change_password === true && user.mustChangePassword,
      };
      const path = String(request.path ?? request.url ?? "");
      if (
        user.mustChangePassword &&
        !path.endsWith("/auth/change-password") &&
        !path.endsWith("/auth/me")
      ) {
        throw new ForbiddenException({
          success: false,
          code: "PASSWORD_CHANGE_REQUIRED",
          message: "Потрібно змінити тимчасовий пароль",
        });
      }
      return true;
    } catch (error) {
      if (
        error instanceof UnauthorizedException ||
        error instanceof ForbiddenException
      )
        throw error;
      throw new UnauthorizedException({
        success: false,
        code: "INVALID_ACCESS_TOKEN",
        message: "Сесія недійсна або завершилася",
      });
    }
  }
}
