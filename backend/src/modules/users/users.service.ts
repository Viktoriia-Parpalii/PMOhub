import { randomBytes } from "node:crypto";
import { HttpStatus, Injectable } from "@nestjs/common";
import * as argon2 from "argon2";
import { PrismaService } from "../../infrastructure/database/prisma.service";
import { AppError } from "../../common/errors/app-error";
import { CreateUserDto, UpdateUserDto } from "./users.dto";
import { Prisma } from "../../generated/prisma/client";

const normalized = (value: string) => value.trim().toLocaleLowerCase("uk-UA");
const publicUser = (user: any) => ({
  id: user.id,
  name: user.name,
  email: user.email,
  role: user.role,
  department_id: user.departmentId ?? undefined,
  is_active: user.isActive,
  must_change_password: user.mustChangePassword,
});

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  async list() {
    return (await this.prisma.user.findMany({ orderBy: { name: "asc" } })).map(
      publicUser,
    );
  }

  async create(
    dto: CreateUserDto,
    actor: { id: string; name: string; role: string },
  ) {
    await this.assertMayAdmin(actor.role);
    this.assertMayManageRole(actor.role, dto.role);
    const temporaryPassword = this.generateTemporaryPassword();
    try {
      const passwordHash = await argon2.hash(temporaryPassword, {
        type: argon2.argon2id,
      });
      const user = await this.prisma.$transaction(async (tx) => {
        await this.assertRoleConfigured(dto.role, tx);
        const created = await tx.user.create({
          data: {
            name: dto.name.trim(),
            email: dto.email.trim(),
            normalizedEmail: normalized(dto.email),
            role: dto.role,
            departmentId: dto.department_id,
            passwordHash,
            mustChangePassword: true,
          },
        });
        await tx.auditEvent.create({
          data: {
            aggregateType: "USER",
            aggregateId: created.id,
            actionCode: "USER_CREATED",
            message: "Користувача створено",
            actorUserId: actor.id,
            actorName: actor.name,
          },
        });
        return created;
      });
      return {
        success: true,
        message: "Користувача додано. Передайте йому тимчасовий пароль.",
        data: { user: publicUser(user), temporary_password: temporaryPassword },
      };
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === "P2002"
      )
        throw new AppError(
          "USER_EXISTS",
          "Користувач із таким email уже існує",
          HttpStatus.CONFLICT,
        );
      throw error;
    }
  }

  async issueTemporaryPassword(
    id: string,
    actor: { id: string; name: string; email: string; role: string },
  ) {
    await this.assertMayAdmin(actor.role);
    const user = await this.prisma.user.findUnique({ where: { id } });
    if (!user)
      throw new AppError(
        "NOT_FOUND",
        "Користувача не знайдено",
        HttpStatus.NOT_FOUND,
      );
    if (normalized(user.email) === normalized(actor.email)) {
      throw new AppError(
        "SELF_TEMPORARY_PASSWORD_FORBIDDEN",
        "Не можна створити тимчасовий пароль для власного облікового запису",
        HttpStatus.FORBIDDEN,
      );
    }
    if (actor.role !== "SUPER_ADMIN" && user.role === "SUPER_ADMIN") {
      throw new AppError(
        "SUPER_ADMIN_PASSWORD_PROTECTED",
        "Лише SUPER_ADMIN може скидати пароль SUPER_ADMIN",
        HttpStatus.FORBIDDEN,
      );
    }
    const temporaryPassword = this.generateTemporaryPassword();
    const updated = await this.prisma.$transaction(async (tx) => {
      const result = await tx.user.update({
        where: { id },
        data: {
          passwordHash: await argon2.hash(temporaryPassword, {
            type: argon2.argon2id,
          }),
          mustChangePassword: true,
        },
      });
      await tx.refreshToken.updateMany({
        where: { userId: id, revokedAt: null },
        data: { revokedAt: new Date() },
      });
      await tx.auditEvent.create({
        data: {
          aggregateType: "USER",
          aggregateId: id,
          actionCode: "TEMPORARY_PASSWORD_ISSUED",
          message: "Видано тимчасовий пароль",
          actorUserId: actor.id,
          actorName: actor.name,
        },
      });
      return result;
    });
    return {
      success: true,
      message:
        "Новий тимчасовий пароль створено. Покажіть його користувачу лише один раз.",
      data: {
        user: publicUser(updated),
        temporary_password: temporaryPassword,
      },
    };
  }

  async update(
    id: string,
    dto: UpdateUserDto,
    actor: { id: string; name: string; role: string },
  ) {
    await this.assertMayAdmin(actor.role);
    const user = await this.prisma.user.findUnique({ where: { id } });
    if (!user)
      throw new AppError(
        "NOT_FOUND",
        "Користувача не знайдено",
        HttpStatus.NOT_FOUND,
      );
    if (id === actor.id && dto.role && dto.role !== user.role)
      throw new AppError(
        "ACTIVE_USER_ROLE",
        "Не можна змінити власну роль",
        HttpStatus.CONFLICT,
      );
    if (id === actor.id && dto.is_active === false)
      throw new AppError(
        "ACTIVE_USER_DEACTIVATE",
        "Не можна деактивувати власний обліковий запис",
        HttpStatus.CONFLICT,
      );
    this.assertMayManageRole(actor.role, user.role);
    if (dto.role) this.assertMayManageRole(actor.role, dto.role);
    try {
      const updated = await this.prisma.$transaction(
        async (tx) => {
          if (
            user.role === "SUPER_ADMIN" &&
            ((dto.role && dto.role !== "SUPER_ADMIN") ||
              dto.is_active === false)
          )
            await this.assertAnotherActiveSuperAdmin(id, tx);
          if (dto.role) await this.assertRoleConfigured(dto.role, tx);
          const result = await tx.user.update({
            where: { id },
            data: {
              name: dto.name?.trim(),
              email: dto.email?.trim(),
              normalizedEmail: dto.email ? normalized(dto.email) : undefined,
              role: dto.role,
              departmentId: dto.department_id,
              isActive: dto.is_active,
            },
          });
          if (dto.is_active === false || (dto.role && dto.role !== user.role))
            await tx.refreshToken.updateMany({
              where: { userId: id, revokedAt: null },
              data: { revokedAt: new Date() },
            });
          await tx.auditEvent.create({
            data: {
              aggregateType: "USER",
              aggregateId: id,
              actionCode: "USER_UPDATED",
              message: "Користувача оновлено",
              actorUserId: actor.id,
              actorName: actor.name,
            },
          });
          return result;
        },
        { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
      );
      return {
        success: true,
        message: "Користувача оновлено",
        data: publicUser(updated),
      };
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === "P2002"
      )
        throw new AppError(
          "USER_EXISTS",
          "Користувач із таким email уже існує",
          HttpStatus.CONFLICT,
        );
      throw error;
    }
  }

  async deactivate(
    id: string,
    actor: { id: string; name: string; role: string },
  ) {
    await this.assertMayAdmin(actor.role);
    if (id === actor.id)
      throw new AppError(
        "ACTIVE_USER_DELETE",
        "Не можна видалити активного користувача",
      );
    const user = await this.prisma.user.findUnique({ where: { id } });
    if (!user)
      throw new AppError(
        "NOT_FOUND",
        "Користувача не знайдено",
        HttpStatus.NOT_FOUND,
      );
    this.assertMayManageRole(actor.role, user.role);
    const result = await this.prisma.$transaction(
      async (tx) => {
        if (user.role === "SUPER_ADMIN")
          await this.assertAnotherActiveSuperAdmin(id, tx);
        const changed = await tx.user.updateMany({
          where: { id },
          data: { isActive: false },
        });
        await tx.refreshToken.updateMany({
          where: { userId: id, revokedAt: null },
          data: { revokedAt: new Date() },
        });
        await tx.auditEvent.create({
          data: {
            aggregateType: "USER",
            aggregateId: id,
            actionCode: "USER_DEACTIVATED",
            message: "Користувача деактивовано",
            actorUserId: actor.id,
            actorName: actor.name,
          },
        });
        return changed;
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
    );
    if (!result.count)
      throw new AppError(
        "NOT_FOUND",
        "Користувача не знайдено",
        HttpStatus.NOT_FOUND,
      );
    return { success: true, message: "Користувача деактивовано" };
  }

  private generateTemporaryPassword() {
    // Base64url gives a high-entropy value without whitespace or ambiguous delimiters.
    return `Pmo-${randomBytes(15).toString("base64url")}!`;
  }

  private assertMayManageRole(actorRole: string, targetRole: string) {
    if (actorRole !== "SUPER_ADMIN" && targetRole === "SUPER_ADMIN") {
      throw new AppError(
        "SUPER_ADMIN_PROTECTED",
        "Лише SUPER_ADMIN може керувати обліковими записами SUPER_ADMIN",
        HttpStatus.FORBIDDEN,
      );
    }
  }

  private async assertMayAdmin(role: string) {
    const permission = await this.prisma.rolePermission.findUnique({
      where: { role },
    });
    if (!permission?.canAccessAdmin || permission.isReadOnly) {
      throw new AppError(
        "FORBIDDEN",
        "Недостатньо прав адміністратора",
        HttpStatus.FORBIDDEN,
      );
    }
  }

  private async assertRoleConfigured(
    role: string,
    client: Pick<Prisma.TransactionClient, "rolePermission"> = this.prisma,
  ) {
    const permission = await client.rolePermission.findUnique({
      where: { role },
      select: { role: true },
    });
    if (!permission) {
      throw new AppError(
        "ROLE_NOT_CONFIGURED",
        "Для обраної ролі не налаштовано права доступу",
        HttpStatus.CONFLICT,
        { role },
      );
    }
  }

  private async assertAnotherActiveSuperAdmin(
    excludedId: string,
    client: Pick<Prisma.TransactionClient, "user"> = this.prisma,
  ) {
    const count = await client.user.count({
      where: { role: "SUPER_ADMIN", isActive: true, id: { not: excludedId } },
    });
    if (!count)
      throw new AppError(
        "LAST_SUPER_ADMIN",
        "Не можна деактивувати або понизити останнього активного SUPER_ADMIN",
        HttpStatus.CONFLICT,
      );
  }
}
