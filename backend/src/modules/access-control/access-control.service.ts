import { HttpStatus, Injectable } from "@nestjs/common";
import { PrismaService } from "../../infrastructure/database/prisma.service";
import { AppError } from "../../common/errors/app-error";
import { AuthUser } from "../../common/auth/auth-user";
import { UpdatePermissionDto } from "./access-control.dto";

@Injectable()
export class AccessControlService {
  constructor(private readonly prisma: PrismaService) {}

  list() {
    return this.prisma.rolePermission.findMany({ orderBy: { role: "asc" } });
  }

  async update(role: string, dto: UpdatePermissionDto, actor: AuthUser) {
    const actorPermission = await this.prisma.rolePermission.findUnique({
      where: { role: actor.role },
    });
    if (
      actor.role !== "SUPER_ADMIN" ||
      !actorPermission?.canAccessAdmin ||
      actorPermission.isReadOnly
    ) {
      throw new AppError(
        "ROLE_FORBIDDEN",
        "Лише активний SUPER_ADMIN може змінювати права ролей",
        HttpStatus.FORBIDDEN,
      );
    }
    if (!["SUPER_ADMIN", "ADMIN", "USER"].includes(role))
      throw new AppError(
        "INVALID_ROLE",
        "Некоректна роль",
        HttpStatus.BAD_REQUEST,
      );
    if (
      role === "SUPER_ADMIN" &&
      (dto.canAccessAdmin === false ||
        dto.isReadOnly === true ||
        dto.canEditArchive === false ||
        dto.canCreateEditInitiatives === false ||
        dto.canDeleteInitiatives === false)
    ) {
      throw new AppError(
        "SUPER_ADMIN_INVARIANT",
        "Системні права SUPER_ADMIN не можна вимкнути",
        HttpStatus.CONFLICT,
      );
    }
    return this.prisma.$transaction(async (tx) => {
      const updated = await tx.rolePermission.update({
        where: { role },
        data: dto,
      });
      await tx.auditEvent.create({
        data: {
          aggregateType: "ROLE_PERMISSION",
          aggregateId: role,
          actionCode: "ROLE_PERMISSION_UPDATED",
          message: `Оновлено права ролі ${role}`,
          actorUserId: actor.id,
          actorName: actor.name,
        },
      });
      return updated;
    });
  }
}
