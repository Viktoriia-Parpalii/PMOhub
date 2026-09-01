import { HttpStatus, Injectable } from "@nestjs/common";
import { PrismaService } from "../../infrastructure/database/prisma.service";
import { AppError } from "../../common/errors/app-error";
import { CustomFieldDto } from "./custom-field.dto";
import { AuthUser } from "../../common/auth/auth-user";

const normalize = (value: string) => value.trim().toLocaleLowerCase("uk-UA");
const map = (item: any) => ({
  id: item.id,
  entityType: item.entityType,
  name: item.name,
  type: item.fieldType,
  isRequired: item.isRequired,
  options: item.options
    .filter((option: any) => option.isActive)
    .map((option: any) => option.value),
  showInTable: item.showInTable,
  showInCards: item.showInCards,
  isActive: item.isActive,
});

@Injectable()
export class CustomFieldsService {
  constructor(private readonly prisma: PrismaService) {}
  async list() {
    return (
      await this.prisma.customFieldDefinition.findMany({
        include: { options: { orderBy: { sortOrder: "asc" } } },
        orderBy: { name: "asc" },
      })
    ).map(map);
  }
  async create(dto: CustomFieldDto, actor: AuthUser) {
    await this.assertMayAdmin(actor);
    const item = await this.prisma.$transaction(async (tx) => {
      const created = await tx.customFieldDefinition.create({
        data: {
          entityType: dto.entityType,
          name: dto.name.trim(),
          normalizedName: normalize(dto.name),
          fieldType: dto.type,
          isRequired: dto.isRequired,
          showInTable: dto.showInTable ?? false,
          showInCards: dto.showInCards ?? false,
          isActive: dto.isActive ?? true,
          options: {
            create:
              dto.type === "SELECT"
                ? [...new Set(dto.options ?? [])].map((value, sortOrder) => ({
                    value,
                    sortOrder,
                  }))
                : [],
          },
        },
        include: { options: { orderBy: { sortOrder: "asc" } } },
      });
      await tx.auditEvent.create({
        data: {
          aggregateType: "CUSTOM_FIELD",
          aggregateId: created.id,
          actionCode: "CUSTOM_FIELD_CREATED",
          message: "Додаткове поле створено",
          actorUserId: actor.id,
          actorName: actor.name,
        },
      });
      return created;
    });
    return { success: true, message: "Поле додано", data: map(item) };
  }
  async update(id: string, dto: CustomFieldDto, actor: AuthUser) {
    await this.assertMayAdmin(actor);
    const item = await this.prisma.$transaction(async (tx) => {
      const current = await tx.customFieldDefinition.findUnique({
        where: { id },
        include: { options: true },
      });
      if (!current)
        throw new AppError(
          "NOT_FOUND",
          "Поле не знайдено",
          HttpStatus.NOT_FOUND,
        );
      const usage = await tx.customFieldValue.count({
        where: { definitionId: id },
      });
      if (
        usage &&
        (dto.entityType !== current.entityType ||
          dto.type !== current.fieldType)
      ) {
        throw new AppError(
          "CUSTOM_FIELD_TYPE_IMMUTABLE",
          "Тип або сутність використаного поля не можна змінити",
          HttpStatus.CONFLICT,
        );
      }
      const nextOptions =
        dto.type === "SELECT" ? [...new Set(dto.options ?? [])] : [];
      const nextValues = new Set(nextOptions);
      const removed = current.options.filter(
        (option) => option.isActive && !nextValues.has(option.value),
      );
      for (const option of removed) {
        const used = Boolean(
          await tx.customFieldValue.count({
            where: { definitionId: id, optionValue: option.value },
          }),
        );
        if (used)
          await tx.customFieldOption.update({
            where: { id: option.id },
            data: { isActive: false, sortOrder: option.sortOrder + 200000 },
          });
        else await tx.customFieldOption.delete({ where: { id: option.id } });
      }
      for (const option of current.options.filter((option) =>
        nextValues.has(option.value),
      )) {
        await tx.customFieldOption.update({
          where: { id: option.id },
          data: { sortOrder: option.sortOrder + 100000 },
        });
      }
      for (const [sortOrder, value] of nextOptions.entries()) {
        const existing = current.options.find(
          (option) => option.value === value,
        );
        if (existing)
          await tx.customFieldOption.update({
            where: { id: existing.id },
            data: { sortOrder, isActive: true },
          });
        else
          await tx.customFieldOption.create({
            data: { definitionId: id, value, sortOrder, isActive: true },
          });
      }
      const updated = await tx.customFieldDefinition.update({
        where: { id },
        data: {
          entityType: dto.entityType,
          name: dto.name.trim(),
          normalizedName: normalize(dto.name),
          fieldType: dto.type,
          isRequired: dto.isRequired,
          showInTable: dto.showInTable,
          showInCards: dto.showInCards,
          isActive: dto.isActive,
        },
        include: { options: { orderBy: { sortOrder: "asc" } } },
      });
      await tx.auditEvent.create({
        data: {
          aggregateType: "CUSTOM_FIELD",
          aggregateId: id,
          actionCode: "CUSTOM_FIELD_UPDATED",
          message: "Додаткове поле оновлено",
          actorUserId: actor.id,
          actorName: actor.name,
        },
      });
      return updated;
    });
    return { success: true, message: "Поле оновлено", data: map(item) };
  }
  async remove(id: string, actor: AuthUser) {
    await this.assertMayAdmin(actor);
    return this.prisma.$transaction(async (tx) => {
      const used = Boolean(
        await tx.customFieldValue.count({ where: { definitionId: id } }),
      );
      if (used)
        await tx.customFieldDefinition.update({
          where: { id },
          data: { isActive: false },
        });
      else await tx.customFieldDefinition.delete({ where: { id } });
      await tx.auditEvent.create({
        data: {
          aggregateType: "CUSTOM_FIELD",
          aggregateId: id,
          actionCode: used
            ? "CUSTOM_FIELD_DEACTIVATED"
            : "CUSTOM_FIELD_DELETED",
          message: used
            ? "Додаткове поле деактивовано"
            : "Додаткове поле видалено",
          actorUserId: actor.id,
          actorName: actor.name,
        },
      });
      return {
        success: true,
        message: used
          ? "Поле використовується у квартальних картках, тому його деактивовано"
          : "Поле видалено",
      };
    });
  }
  private async assertMayAdmin(actor: AuthUser) {
    const permission = await this.prisma.rolePermission.findUnique({
      where: { role: actor.role },
    });
    if (!permission?.canAccessAdmin || permission.isReadOnly)
      throw new AppError(
        "FORBIDDEN",
        "Недостатньо прав адміністратора",
        HttpStatus.FORBIDDEN,
      );
  }
}
