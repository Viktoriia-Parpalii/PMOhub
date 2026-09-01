import { HttpStatus, Injectable } from "@nestjs/common";
import { AuthUser } from "../../common/auth/auth-user";
import { AppError } from "../../common/errors/app-error";
import { PrismaService } from "../../infrastructure/database/prisma.service";

@Injectable()
export class ExportAuthorizationService {
  constructor(private readonly prisma: PrismaService) {}

  async assertAdmin(actor: AuthUser) {
    if (actor.role === "SUPER_ADMIN") return;
    const permissions = await this.prisma.rolePermission.findUnique({
      where: { role: actor.role },
      select: { canAccessAdmin: true },
    });
    if (!permissions?.canAccessAdmin) {
      throw new AppError(
        "EXPORT_FORBIDDEN",
        "У вас немає права експортувати дані",
        HttpStatus.FORBIDDEN,
      );
    }
  }

  assertSuperAdmin(actor: AuthUser) {
    if (actor.role !== "SUPER_ADMIN") {
      throw new AppError(
        "FULL_EXPORT_FORBIDDEN",
        "Повний системний JSON може експортувати лише супер адміністратор",
        HttpStatus.FORBIDDEN,
      );
    }
  }
}
