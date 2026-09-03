import { HttpStatus, Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { Prisma, PrismaClient } from "../../generated/prisma/client";
import { PrismaService } from "../../infrastructure/database/prisma.service";
import { AppError } from "../../common/errors/app-error";
import { DictionaryDto } from "./dictionary.dto";
import { isPeriodLocked } from "../initiatives/domain/period.policy";
import { AuthUser } from "../../common/auth/auth-user";

export type DictionaryType =
  | "departments"
  | "managers"
  | "priorities"
  | "statuses"
  | "weights"
  | "sizes";
const normalize = (value: string) => value.trim().toLocaleLowerCase("uk-UA");

@Injectable()
export class DictionariesService {
  private readonly zone: string;
  constructor(
    private readonly prisma: PrismaService,
    config: ConfigService,
  ) {
    this.zone = config.get<string>("BUSINESS_TIME_ZONE") ?? "Europe/Kyiv";
  }

  async list(type: DictionaryType) {
    switch (type) {
      case "departments":
        return (
          await this.prisma.department.findMany({ orderBy: { name: "asc" } })
        ).map((x) => ({
          id: x.id,
          name: x.name,
          capacity_limit_points: x.capacityLimitPoints.toNumber(),
          is_active: x.isActive,
        }));
      case "managers":
        return (
          await this.prisma.manager.findMany({ orderBy: { name: "asc" } })
        ).map((x) => ({
          id: x.id,
          name: x.name,
          department_id: x.departmentId ?? undefined,
          is_active: x.isActive,
        }));
      case "priorities":
        return (
          await this.prisma.priority.findMany({ orderBy: { name: "asc" } })
        ).map((x) => ({
          id: x.id,
          name: x.name,
          color: x.color ?? undefined,
          is_active: x.isActive,
        }));
      case "statuses":
        return (
          await this.prisma.initiativeStatus.findMany({
            orderBy: { name: "asc" },
          })
        ).map((x) => ({
          id: x.id,
          code: x.code,
          name: x.name,
          color: x.color,
          is_active: x.isActive,
          is_system: x.isSystem,
        }));
      case "weights":
        return (
          await this.prisma.taskWeight.findMany({ orderBy: { weight: "asc" } })
        ).map((x) => ({
          id: x.id,
          name: x.name,
          weight: x.weight.toNumber(),
          is_active: x.isActive,
          is_default: x.isDefault,
          is_system: x.isSystem,
        }));
      case "sizes":
        return (
          await this.prisma.initiativeSize.findMany({
            orderBy: { minScore: "asc" },
          })
        ).map((x) => ({
          id: x.id,
          name: x.name,
          min_score: x.minScore.toNumber(),
          max_score: x.maxScore.toNumber(),
          is_active: x.isActive,
        }));
    }
  }

  async create(type: DictionaryType, dto: DictionaryDto, actor: AuthUser) {
    await this.assertMayAdmin(actor);
    this.requireName(dto);
    try {
      const data = await this.prisma.$transaction(
        async (tx) => {
          let created: any;
          switch (type) {
            case "departments":
              created = await tx.department.create({
                data: {
                  name: dto.name!,
                  normalizedName: normalize(dto.name!),
                  capacityLimitPoints: dto.capacity_limit_points ?? 0,
                  isActive: dto.is_active ?? true,
                },
              });
              break;
            case "managers":
              created = await tx.manager.create({
                data: {
                  name: dto.name!,
                  normalizedName: normalize(dto.name!),
                  departmentId: dto.department_id,
                  isActive: dto.is_active ?? true,
                },
              });
              break;
            case "priorities":
              created = await tx.priority.create({
                data: {
                  name: dto.name!,
                  normalizedName: normalize(dto.name!),
                  color: dto.color,
                  isActive: dto.is_active ?? true,
                },
              });
              break;
            case "statuses":
              created = await tx.initiativeStatus.create({
                data: {
                  // `code` is an internal, stable analytics/export key. The UI
                  // identifies a status by UUID and does not need to supply it.
                  code: dto.code?.trim() || crypto.randomUUID().replaceAll("-", ""),
                  name: dto.name!,
                  normalizedName: normalize(dto.name!),
                  color: dto.color ?? "#94a3b8",
                  isActive: dto.is_active ?? true,
                },
              });
              break;
            case "weights":
              created = await tx.taskWeight.create({
                data: {
                  name: dto.name!,
                  normalizedName: normalize(dto.name!),
                  weight: dto.weight ?? 0,
                  isActive: dto.is_active ?? true,
                },
              });
              break;
            case "sizes":
              await this.assertSizeRange(tx, dto);
              created = await tx.initiativeSize.create({
                data: {
                  name: dto.name!,
                  normalizedName: normalize(dto.name!),
                  minScore: dto.min_score ?? 0,
                  maxScore: dto.max_score ?? 0,
                  isActive: dto.is_active ?? true,
                },
              });
              break;
          }
          await tx.auditEvent.create({
            data: {
              aggregateType: "DICTIONARY",
              aggregateId: created.id,
              actionCode: "DICTIONARY_CREATED",
              message: `Створено запис довідника ${type}`,
              actorUserId: actor.id,
              actorName: actor.name,
            },
          });
          return created;
        },
        { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
      );
      return { success: true, message: "Запис додано", data };
    } catch (error) {
      this.rethrow(error);
    }
  }

  async update(
    type: DictionaryType,
    id: string,
    dto: DictionaryDto,
    actor: AuthUser,
  ) {
    await this.assertMayAdmin(actor);
    try {
      await this.prisma.$transaction(
        async (tx) => {
          if (type === "statuses") {
            const status = await tx.initiativeStatus.findUnique({
              where: { id },
            });
            if (
              status?.isSystem &&
              ((dto.code && dto.code !== status.code) ||
                dto.is_active === false)
            )
              throw new AppError(
                "SYSTEM_DICTIONARY_IMMUTABLE",
                "Системний статус не можна деактивувати або змінити його код",
                HttpStatus.CONFLICT,
              );
          }
          if (type === "weights") {
            const weight = await tx.taskWeight.findUnique({ where: { id } });
            if (
              weight?.isSystem &&
              ((dto.name !== undefined && dto.name.trim() !== weight.name) ||
                (dto.weight !== undefined && dto.weight !== 0) ||
                dto.is_active === false)
            )
              throw new AppError(
                "SYSTEM_DICTIONARY_IMMUTABLE",
                "Системну вагу не можна деактивувати або змінити",
                HttpStatus.CONFLICT,
              );
          }
          if (type === "sizes") {
            const current = await tx.initiativeSize.findUnique({
              where: { id },
            });
            if (!current)
              throw new AppError(
                "NOT_FOUND",
                "Розмір не знайдено",
                HttpStatus.NOT_FOUND,
              );
            await this.assertSizeRange(
              tx,
              {
                ...dto,
                min_score: dto.min_score ?? current.minScore.toNumber(),
                max_score: dto.max_score ?? current.maxScore.toNumber(),
                is_active: dto.is_active ?? current.isActive,
              },
              id,
            );
          }
          const common = dto.name
            ? { name: dto.name.trim(), normalizedName: normalize(dto.name) }
            : {};
          switch (type) {
            case "departments":
              await tx.department.update({
                where: { id },
                data: {
                  ...common,
                  capacityLimitPoints: dto.capacity_limit_points,
                  isActive: dto.is_active,
                },
              });
              break;
            case "managers":
              await tx.manager.update({
                where: { id },
                data: {
                  ...common,
                  departmentId: dto.department_id,
                  isActive: dto.is_active,
                },
              });
              break;
            case "priorities":
              await tx.priority.update({
                where: { id },
                data: { ...common, color: dto.color, isActive: dto.is_active },
              });
              break;
            case "statuses":
              await tx.initiativeStatus.update({
                where: { id },
                data: {
                  ...common,
                  code: dto.code,
                  color: dto.color,
                  isActive: dto.is_active,
                },
              });
              break;
            case "weights":
              await tx.taskWeight.update({
                where: { id },
                data: {
                  ...common,
                  weight: dto.weight,
                  isActive: dto.is_active,
                },
              });
              break;
            case "sizes":
              await tx.initiativeSize.update({
                where: { id },
                data: {
                  ...common,
                  minScore: dto.min_score,
                  maxScore: dto.max_score,
                  isActive: dto.is_active,
                },
              });
              break;
          }
          await tx.auditEvent.create({
            data: {
              aggregateType: "DICTIONARY",
              aggregateId: id,
              actionCode: "DICTIONARY_UPDATED",
              message: `Оновлено запис довідника ${type}`,
              actorUserId: actor.id,
              actorName: actor.name,
            },
          });
        },
        { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
      );
      return { success: true, message: "Запис оновлено" };
    } catch (error) {
      this.rethrow(error);
    }
  }

  async remove(type: DictionaryType, id: string, actor: AuthUser) {
    await this.assertMayAdmin(actor);
    if (
      type === "statuses" &&
      (await this.prisma.initiativeStatus.findUnique({ where: { id } }))
        ?.isSystem
    )
      throw new AppError(
        "SYSTEM_DICTIONARY_IMMUTABLE",
        "Системний статус не можна видалити",
        HttpStatus.CONFLICT,
      );
    if (
      type === "weights" &&
      (await this.prisma.taskWeight.findUnique({ where: { id } }))?.isSystem
    )
      throw new AppError(
        "SYSTEM_DICTIONARY_IMMUTABLE",
        "Системну вагу не можна видалити",
        HttpStatus.CONFLICT,
      );
    const usage = await this.usage(type, id);
    await this.prisma.$transaction(async (tx) => {
      const active = usage.length > 0;
      switch (type) {
        case "departments":
          active
            ? await tx.department.update({
                where: { id },
                data: { isActive: false },
              })
            : await tx.department.delete({ where: { id } });
          break;
        case "managers":
          active
            ? await tx.manager.update({
                where: { id },
                data: { isActive: false },
              })
            : await tx.manager.delete({ where: { id } });
          break;
        case "priorities":
          active
            ? await tx.priority.update({
                where: { id },
                data: { isActive: false },
              })
            : await tx.priority.delete({ where: { id } });
          break;
        case "statuses":
          active
            ? await tx.initiativeStatus.update({
                where: { id },
                data: { isActive: false },
              })
            : await tx.initiativeStatus.delete({ where: { id } });
          break;
        case "weights":
          active
            ? await tx.taskWeight.update({
                where: { id },
                data: { isActive: false },
              })
            : await tx.taskWeight.delete({ where: { id } });
          break;
        case "sizes":
          active
            ? await tx.initiativeSize.update({
                where: { id },
                data: { isActive: false },
              })
            : await tx.initiativeSize.delete({ where: { id } });
          break;
      }
      await tx.auditEvent.create({
        data: {
          aggregateType: "DICTIONARY",
          aggregateId: id,
          actionCode: active ? "DICTIONARY_DEACTIVATED" : "DICTIONARY_DELETED",
          message: `${active ? "Деактивовано" : "Видалено"} запис довідника ${type}`,
          actorUserId: actor.id,
          actorName: actor.name,
        },
      });
    });
    if (usage.length)
      return {
        success: true,
        message: `Запис використовується у ${usage.join(", ")}, тому його деактивовано`,
      };
    return {
      success: true,
      message:
        type === "weights"
          ? "Вагу видалено. Знімки у картках збережено"
          : "Запис видалено",
    };
  }

  async applyWeightToOpenCards(id: string, actor: AuthUser) {
    await this.assertMayAdmin(actor);
    const result = await this.prisma.$transaction(
      async (tx) => {
        const definition = await tx.taskWeight.findUnique({ where: { id } });
        if (!definition)
          throw new AppError(
            "NOT_FOUND",
            "Вагу не знайдено",
            HttpStatus.NOT_FOUND,
          );
        const cards = await tx.quarterCard.findMany({
          where: { scopeItems: { some: { weightDefinitionId: id } } },
          include: { initiativeYear: true, scopeItems: true },
        });
        const sizes = await this.sizeDefinitions(tx);
        let changedCards = 0;
        let changedTasks = 0;
        for (const card of cards) {
          if (
            isPeriodLocked(
              card.initiativeYear.year,
              `Q${card.quarter}` as any,
              this.zone,
            )
          )
            continue;
          const affected = card.scopeItems.filter(
            (item) => item.weightDefinitionId === id,
          );
          if (!affected.length) continue;
          await tx.scopeItem.updateMany({
            where: { id: { in: affected.map((item) => item.id) } },
            data: {
              weightSnapshotName: definition.name,
              weightSnapshotValue: definition.weight,
              revision: { increment: 1 },
            },
          });
          const total = card.scopeItems.reduce(
            (sum, item) =>
              sum +
              (item.weightDefinitionId === id
                ? definition.weight.toNumber()
                : item.weightSnapshotValue.toNumber()),
            0,
          );
          const size = sizes.find(
            (item) =>
              item.isActive && total >= item.minScore && total <= item.maxScore,
          );
          await tx.quarterCard.update({
            where: { id: card.id },
            data: {
              totalWeight: total,
              sizeDefinitionId: size?.id ?? null,
              sizeSnapshotName: size?.name ?? "Не визначено",
              sizeSnapshotMin: size?.minScore ?? null,
              sizeSnapshotMax: size?.maxScore ?? null,
              revision: { increment: 1 },
            },
          });
          changedCards += 1;
          changedTasks += affected.length;
        }
        await tx.auditEvent.create({
          data: {
            aggregateType: "TASK_WEIGHT",
            aggregateId: id,
            actionCode: "WEIGHT_APPLIED_TO_OPEN_CARDS",
            message: `Оновлено задач: ${changedTasks}`,
            actorUserId: actor.id,
            actorName: actor.name,
          },
        });
        return { cards: changedCards, tasks: changedTasks };
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
    );
    return {
      success: true,
      message: `Оновлено задач: ${result.tasks}`,
      data: result,
    };
  }

  async recalculateOpenCardSizes(actor: AuthUser) {
    await this.assertMayAdmin(actor);
    const result = await this.prisma.$transaction(
      async (tx) => {
        const cards = await tx.quarterCard.findMany({
          include: { initiativeYear: true, scopeItems: true },
        });
        const sizes = await this.sizeDefinitions(tx);
        let changedCards = 0;
        for (const card of cards) {
          if (
            isPeriodLocked(
              card.initiativeYear.year,
              `Q${card.quarter}` as any,
              this.zone,
            )
          )
            continue;
          const total = card.scopeItems.reduce(
            (sum, item) => sum + item.weightSnapshotValue.toNumber(),
            0,
          );
          const size = sizes.find(
            (item) =>
              item.isActive && total >= item.minScore && total <= item.maxScore,
          );
          await tx.quarterCard.update({
            where: { id: card.id },
            data: {
              totalWeight: total,
              sizeDefinitionId: size?.id ?? null,
              sizeSnapshotName: size?.name ?? "Не визначено",
              sizeSnapshotMin: size?.minScore ?? null,
              sizeSnapshotMax: size?.maxScore ?? null,
              revision: { increment: 1 },
            },
          });
          changedCards += 1;
        }
        await tx.auditEvent.create({
          data: {
            aggregateType: "INITIATIVE_SIZE",
            aggregateId: "OPEN_CARDS",
            actionCode: "OPEN_CARD_SIZES_RECALCULATED",
            message: `Перераховано карток: ${changedCards}`,
            actorUserId: actor.id,
            actorName: actor.name,
          },
        });
        return { cards: changedCards };
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
    );
    return {
      success: true,
      message: `Розмір оновлено в картках: ${result.cards}`,
      data: result,
    };
  }

  private async sizeDefinitions(tx: Prisma.TransactionClient) {
    return (await tx.initiativeSize.findMany()).map((item) => ({
      id: item.id,
      name: item.name,
      minScore: item.minScore.toNumber(),
      maxScore: item.maxScore.toNumber(),
      isActive: item.isActive,
    }));
  }

  private requireName(dto: DictionaryDto) {
    if (!dto.name?.trim())
      throw new AppError("VALIDATION_ERROR", "Вкажіть назву");
  }
  private async assertMayAdmin(actor: AuthUser) {
    const permission = await this.prisma.rolePermission.findUnique({
      where: { role: actor.role },
      include: { roleDefinition: true },
    });
    if (
      !permission?.canAccessAdmin ||
      permission.roleDefinition?.isActive === false ||
      permission.isReadOnly
    )
      throw new AppError(
        "FORBIDDEN",
        "Недостатньо прав адміністратора",
        HttpStatus.FORBIDDEN,
      );
  }
  private async assertSizeRange(
    tx: Prisma.TransactionClient,
    dto: DictionaryDto,
    ignoredId?: string,
  ) {
    const min = dto.min_score ?? 0,
      max = dto.max_score ?? 0;
    if (max < min)
      throw new AppError("INVALID_SIZE_RANGE", "Некоректний діапазон розміру");
    if (
      dto.is_active !== false &&
      (await tx.initiativeSize.findFirst({
        where: {
          id: ignoredId ? { not: ignoredId } : undefined,
          isActive: true,
          minScore: { lte: max },
          maxScore: { gte: min },
        },
      }))
    )
      throw new AppError(
        "OVERLAPPING_SIZE_RANGE",
        "Діапазон перетинається з іншим активним розміром",
      );
  }
  private async usage(type: DictionaryType, id: string) {
    const result: string[] = [];
    if (type === "departments") {
      if (
        await this.prisma.preparationStageDepartment.count({
          where: { departmentId: id },
        })
      )
        result.push("підготовчих етапах");
      if (
        await this.prisma.quarterCardDepartment.count({
          where: { departmentId: id },
        })
      )
        result.push("картках");
      if (
        await this.prisma.scopeItemExecutor.count({
          where: { departmentId: id },
        })
      )
        result.push("завданнях");
      if (await this.prisma.manager.count({ where: { departmentId: id } }))
        result.push("менеджерах");
      if (await this.prisma.user.count({ where: { departmentId: id } }))
        result.push("користувачах");
    }
    if (
      type === "managers" &&
      ((await this.prisma.preparationStage.count({
        where: { managerId: id },
      })) ||
        (await this.prisma.quarterCard.count({ where: { managerId: id } })))
    )
      result.push("ініціативах");
    if (
      type === "priorities" &&
      ((await this.prisma.preparationStage.count({
        where: { priorityId: id },
      })) ||
        (await this.prisma.quarterCard.count({ where: { priorityId: id } })))
    )
      result.push("ініціативах");
    if (
      type === "statuses" &&
      (await this.prisma.quarterCard.count({ where: { statusId: id } }))
    )
      result.push("картках");
    if (
      type === "sizes" &&
      (await this.prisma.quarterCard.count({ where: { sizeDefinitionId: id } }))
    )
      result.push("картках");
    return result;
  }
  private async deactivate(type: DictionaryType, id: string) {
    switch (type) {
      case "departments":
        await this.prisma.department.update({
          where: { id },
          data: { isActive: false },
        });
        break;
      case "managers":
        await this.prisma.manager.update({
          where: { id },
          data: { isActive: false },
        });
        break;
      case "priorities":
        await this.prisma.priority.update({
          where: { id },
          data: { isActive: false },
        });
        break;
      case "statuses":
        await this.prisma.initiativeStatus.update({
          where: { id },
          data: { isActive: false },
        });
        break;
      case "weights":
        await this.prisma.taskWeight.update({
          where: { id },
          data: { isActive: false },
        });
        break;
      case "sizes":
        await this.prisma.initiativeSize.update({
          where: { id },
          data: { isActive: false },
        });
        break;
    }
  }
  private rethrow(error: unknown): never {
    if (error instanceof AppError) throw error;
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    )
      throw new AppError(
        "DUPLICATE_DICTIONARY_VALUE",
        "Назва або код має бути унікальним",
        HttpStatus.CONFLICT,
      );
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2025"
    )
      throw new AppError(
        "NOT_FOUND",
        "Запис не знайдено",
        HttpStatus.NOT_FOUND,
      );
    throw error;
  }
}
