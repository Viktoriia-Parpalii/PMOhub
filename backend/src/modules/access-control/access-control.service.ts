import { HttpStatus, Injectable } from "@nestjs/common";
import { PrismaService } from "../../infrastructure/database/prisma.service";
import { AppError } from "../../common/errors/app-error";
import { AuthUser } from "../../common/auth/auth-user";
import { UpdatePermissionDto } from "./access-control.dto";

@Injectable()
export class AccessControlService {
  constructor(private readonly prisma: PrismaService) {}

  async list() {
    const rows = await this.prisma.rolePermission.findMany({
      include: { roleDefinition: true },
      orderBy: { roleDefinition: { name: "asc" } },
    });
    return rows.map(({ roleDefinition, ...permission }) => ({
      ...permission,
      roleName: roleDefinition.name,
      isSystem: roleDefinition.isSystem,
      isDefault: roleDefinition.isDefault,
      isActive: roleDefinition.isActive,
    }));
  }

  async update(role: string, dto: UpdatePermissionDto, actor: AuthUser) {
    const actorPermission = await this.prisma.rolePermission.findUnique({
      where: { role: actor.role },
      include: { roleDefinition: true },
    });
    if (
      actor.role !== "SUPER_ADMIN" ||
      actorPermission?.roleDefinition?.isActive === false ||
      !actorPermission?.canAccessAdmin ||
      actorPermission.isReadOnly
    ) {
      throw new AppError(
        "ROLE_FORBIDDEN",
        "Лише активний SUPER_ADMIN може змінювати права ролей",
        HttpStatus.FORBIDDEN,
      );
    }
    const roleDefinition = await this.prisma.role.findUnique({
      where: { code: role },
      include: { rolePermission: true },
    });
    if (!roleDefinition?.isActive || !roleDefinition.rolePermission)
      throw new AppError(
        "INVALID_ROLE",
        "Роль не існує, неактивна або не має налаштованих прав",
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
