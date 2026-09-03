import { randomUUID } from "node:crypto";
import { HttpStatus, Injectable } from "@nestjs/common";
import { Prisma } from "../../../generated/prisma/client";
import { PrismaService } from "../../../infrastructure/database/prisma.service";
import { AuthUser } from "../../../common/auth/auth-user";
import { AppError } from "../../../common/errors/app-error";
import {
  CreateInitiativeDto,
  CreateQuarterCardDto,
  ExtendYearsDto,
  InitialQuarterCardDto,
  PeriodCommandDto,
  QuarterDto,
  UpdateCardDto,
  UpdateCardStatusDto,
  UpdateArchivedCardDto,
  UpdateBacklogDto,
  UpdateInitiativeDto,
  UpdateInitiativeYearDto,
  UpdatePreparationDto,
} from "../api/initiative.dto";
import { currentPeriod, isPeriodLocked } from "../domain/period.policy";
import { sanitizeRichText } from "../../../common/security/rich-text";
import { cardInclude, mapCard } from "../infrastructure/initiative.mapper";

type Tx = Prisma.TransactionClient;
type Defaults = {
  managerId: string | null;
  priorityId: string | null;
  departmentIds: string[];
};
const ok = <T>(message: string, data: T) => ({
  success: true as const,
  message,
  data,
});
const qn = (quarter: QuarterDto) => Number(quarter.slice(1));
const qs = (quarter: number) => `Q${quarter}` as QuarterDto;
const unique = (values: string[]) => [...new Set(values)];

@Injectable()
export class InitiativesService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateInitiativeDto, actor: AuthUser) {
    await this.assertCanEdit(actor);
    const result = await this.prisma.$transaction(
      async (tx) => {
        const name = dto.name.trim();
        const existing = await tx.initiative.findFirst({
          where: { kind: dto.kind, name },
          select: { id: true },
        });
        if (existing) {
          throw new AppError(
            "INITIATIVE_NAME_CONFLICT",
            "Ініціатива з такою назвою вже існує в беклозі.",
            HttpStatus.CONFLICT,
            { initiative_id: existing.id },
          );
        }
        const initial = dto.initial_card;
        await this.assertReferences(
          tx,
          dto.preparation.manager_id,
          dto.preparation.priority_id,
          dto.preparation.department_ids,
        );
        if (initial) {
          await this.assertReferences(
            tx,
            initial.manager_id,
            initial.priority_id,
            [
              ...initial.department_ids,
              ...initial.scope.flatMap((item) => item.executor_department_ids),
            ],
          );
        }
        if (initial) {
          this.assertOpen(dto.year, initial.quarter);
          if (initial.status_id)
            await this.assertCardStatus(tx, initial.status_id);
          this.assertNewScopePayload(initial.scope);
        }
        const initiative = await tx.initiative.create({
          data: {
            kind: dto.kind,
            name,
            years: {
              create: {
                year: dto.year,
                strategicGoal: dto.strategic_goal?.trim() || null,
                preparationStage: {
                  create: {
                    managerId: dto.preparation.manager_id ?? null,
                    priorityId: dto.preparation.priority_id ?? null,
                    departments: {
                      createMany: {
                        data: unique(dto.preparation.department_ids).map(
                          (departmentId) => ({ departmentId }),
                        ),
                      },
                    },
                  },
                },
              },
            },
          },
          include: { years: true },
        });
        const yearId = initiative.years[0].id;
        let cardId: string | undefined;
        if (initial) {
          const weights = await this.loadWeights(
            tx,
            initial.scope.map((item) => item.weight_definition_id),
          );
          const card = await this.createEmptyCard(
            tx,
            yearId,
            qn(initial.quarter),
            {
              managerId: initial.manager_id ?? null,
              priorityId: initial.priority_id ?? null,
              departmentIds: initial.department_ids,
            },
            initial.notes?.trim() || null,
          );
          if (initial.status_id)
            await tx.quarterCard.update({
              where: { id: card.id },
              data: { statusId: initial.status_id },
            });
          for (const item of initial.scope) {
            const weight = weights.get(item.weight_definition_id)!;
            await tx.scopeItem.create({
              data: {
                quarterCardId: card.id,
                lineageId: item.lineage_id ?? randomUUID(),
                text: item.text.trim(),
                statusCode: item.status_code,
                weightDefinitionId: weight.id,
                weightSnapshotName: weight.name,
                weightSnapshotValue: weight.weight,
                executors: {
                  createMany: {
                    data: unique(item.executor_department_ids).map(
                      (departmentId) => ({ departmentId }),
                    ),
                  },
                },
              },
            });
          }
          const executorIds = initial.scope.flatMap(
            (item) => item.executor_department_ids,
          );
          await this.replaceCardDepartments(
            tx,
            card.id,
            unique([...initial.department_ids, ...executorIds]),
          );
          await this.replaceCustomFields(
            tx,
            card.id,
            dto.kind,
            initial.custom_fields ?? {},
          );
          await this.recalculateCard(tx, card.id);
          await this.audit(
            tx,
            "QuarterCard",
            card.id,
            "CARD_CREATED",
            "Створено початкову квартальну картку",
            actor,
            dto.year,
            initial.quarter,
          );
          cardId = card.id;
        }
        await this.audit(
          tx,
          "InitiativeYear",
          yearId,
          "INITIATIVE_CREATED",
          "Створено запис у беклозі",
          actor,
        );
        return {
          initiative_id: initiative.id,
          initiative_revision: initiative.revision,
          year_id: yearId,
          year_revision: 1,
          card_id: cardId,
        };
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
    );
    return ok("Ініціативу створено", result);
  }

  async updateInitiative(
    id: string,
    dto: UpdateInitiativeDto,
    actor: AuthUser,
  ) {
    await this.assertCanEdit(actor);
    const result = await this.prisma.$transaction(async (tx) => {
      const changed = await tx.initiative.updateMany({
        where: { id, revision: dto.revision },
        data: { name: dto.name.trim(), revision: { increment: 1 } },
      });
      if (!changed.count) await this.throwConflict(tx, "Initiative", id);
      await this.audit(
        tx,
        "Initiative",
        id,
        "INITIATIVE_RENAMED",
        "Змінено глобальну назву ініціативи",
        actor,
      );
      return { id, revision: dto.revision + 1 };
    });
    return ok("Назву оновлено", result);
  }

  async updateYear(id: string, dto: UpdateInitiativeYearDto, actor: AuthUser) {
    await this.assertCanEdit(actor);
    const result = await this.prisma.$transaction(async (tx) => {
      const year = await tx.initiativeYear.findUnique({ where: { id } });
      if (!year) throw this.notFound("Рік ініціативи");
      if (this.yearLocked(year.year)) throw this.archived();
      const changed = await tx.initiativeYear.updateMany({
        where: { id, revision: dto.revision },
        data: {
          strategicGoal: dto.strategic_goal?.trim() || null,
          revision: { increment: 1 },
        },
      });
      if (!changed.count) await this.throwConflict(tx, "InitiativeYear", id);
      await this.audit(
        tx,
        "InitiativeYear",
        id,
        "YEAR_GOAL_UPDATED",
        "Змінено стратегічну задачу року",
        actor,
      );
      return { id, revision: dto.revision + 1 };
    });
    return ok("Стратегічну задачу оновлено", result);
  }

  async updateBacklog(id: string, dto: UpdateBacklogDto, actor: AuthUser) {
    await this.assertCanEdit(actor);
    const result = await this.prisma.$transaction(
      async (tx) => {
        const year = await tx.initiativeYear.findUnique({ where: { id } });
        if (!year) throw this.notFound("Рік ініціативи");
        if (this.yearLocked(year.year)) throw this.archived();
        const rootChanged = await tx.initiative.updateMany({
          where: { id: year.initiativeId, revision: dto.initiative_revision },
          data: { name: dto.name.trim(), revision: { increment: 1 } },
        });
        if (!rootChanged.count)
          await this.throwConflict(tx, "Initiative", year.initiativeId);
        const yearChanged = await tx.initiativeYear.updateMany({
          where: { id, revision: dto.year_revision },
          data: {
            strategicGoal: dto.strategic_goal?.trim() || null,
            revision: { increment: 1 },
          },
        });
        if (!yearChanged.count)
          await this.throwConflict(tx, "InitiativeYear", id);
        await this.audit(
          tx,
          "InitiativeYear",
          id,
          "BACKLOG_UPDATED",
          "Оновлено назву та стратегічну задачу",
          actor,
        );
        return {
          initiative_id: year.initiativeId,
          initiative_revision: dto.initiative_revision + 1,
          year_id: id,
          year_revision: dto.year_revision + 1,
        };
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
    );
    return ok("Дані беклогу оновлено", result);
  }

  async updatePreparation(
    id: string,
    dto: UpdatePreparationDto,
    actor: AuthUser,
  ) {
    await this.assertCanEdit(actor);
    const result = await this.prisma.$transaction(async (tx) => {
      const year = await tx.initiativeYear.findUnique({
        where: { id },
        include: { preparationStage: true },
      });
      if (!year?.preparationStage) throw this.notFound("Підготовчий етап");
      if (this.yearLocked(year.year)) throw this.archived();
      await this.assertReferences(
        tx,
        dto.manager_id,
        dto.priority_id,
        dto.department_ids,
      );
      const changed = await tx.preparationStage.updateMany({
        where: { initiativeYearId: id, revision: dto.revision },
        data: {
          managerId: dto.manager_id ?? null,
          priorityId: dto.priority_id ?? null,
          revision: { increment: 1 },
        },
      });
      if (!changed.count) await this.throwPreparationConflict(tx, id);
      await this.replacePreparationDepartments(tx, id, dto.department_ids);
      await this.audit(
        tx,
        "PreparationStage",
        id,
        "PREPARATION_UPDATED",
        "Оновлено підготовчий етап",
        actor,
      );
      return { initiative_year_id: id, revision: dto.revision + 1 };
    });
    return ok("Підготовчий етап оновлено", result);
  }

  async createQuarterCard(
    yearId: string,
    dto: CreateQuarterCardDto,
    actor: AuthUser,
  ) {
    await this.assertCanEdit(actor);
    const result = await this.prisma.$transaction(
      async (tx) => {
        const year = await tx.initiativeYear.findUnique({
          where: { id: yearId },
          include: {
            preparationStage: { include: { departments: true } },
            quarterCards: {
              where: { quarter: { lt: qn(dto.quarter) } },
              include: {
                departments: true,
                scopeItems: { include: { executors: true } },
              },
              orderBy: { quarter: "desc" },
            },
          },
        });
        if (!year) throw this.notFound("Рік ініціативи");
        this.assertOpen(year.year, dto.quarter);
        const occupied = await tx.quarterCard.findUnique({
          where: {
            initiativeYearId_quarter: {
              initiativeYearId: yearId,
              quarter: qn(dto.quarter),
            },
          },
        });
        if (occupied) throw this.targetOccupied();
        const previous = year.quarterCards[0];
        const defaults: Defaults = previous
          ? {
              managerId: previous.managerId,
              priorityId: previous.priorityId,
              departmentIds: this.effectiveDepartmentIds(previous),
            }
          : {
              managerId: year.preparationStage?.managerId ?? null,
              priorityId: year.preparationStage?.priorityId ?? null,
              departmentIds:
                year.preparationStage?.departments.map(
                  (item) => item.departmentId,
                ) ?? [],
            };
        const card = await this.createEmptyCard(
          tx,
          yearId,
          qn(dto.quarter),
          defaults,
        );
        await this.audit(
          tx,
          "QuarterCard",
          card.id,
          "CARD_CREATED",
          "Створено квартальну картку",
          actor,
          year.year,
          dto.quarter,
        );
        return {
          card_id: card.id,
          card_revision: card.revision,
          year_id: yearId,
        };
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
    );
    return ok("Квартальну картку створено", result);
  }

  async updateCard(id: string, dto: UpdateCardDto, actor: AuthUser) {
    await this.assertCanEdit(actor);
    const result = await this.prisma.$transaction(
      async (tx) => {
        const current = await tx.quarterCard.findUnique({
          where: { id },
          include: {
            initiativeYear: { include: { initiative: true } },
            scopeItems: { include: { executors: true } },
          },
        });
        if (!current) throw this.notFound("Картку");
        if (isPeriodLocked(current.initiativeYear.year, qs(current.quarter)))
          throw this.archived();
        await this.assertReferences(tx, dto.manager_id, dto.priority_id, [
          ...dto.department_ids,
          ...dto.scope.flatMap((item) => item.executor_department_ids),
        ]);
        await this.assertCardStatus(tx, dto.status_id);
        const weights = await this.loadWeights(
          tx,
          dto.scope.map((item) => item.weight_definition_id),
        );
        this.assertScopePayload(current.scopeItems, dto.scope);

        const changed = await tx.quarterCard.updateMany({
          where: { id, revision: dto.revision },
          data: {
            managerId: dto.manager_id ?? null,
            priorityId: dto.priority_id ?? null,
            statusId: dto.status_id,
            notes: dto.notes ? sanitizeRichText(dto.notes) || null : null,
            revision: { increment: 1 },
          },
        });
        if (!changed.count) await this.throwConflict(tx, "QuarterCard", id);

        const incomingIds = new Set(
          dto.scope.flatMap((item) => (item.id ? [item.id] : [])),
        );
        const removedIds = current.scopeItems
          .filter((item) => !incomingIds.has(item.id))
          .map((item) => item.id);
        if (removedIds.length) {
          await tx.scopeItem.updateMany({
            where: { copiedFromItemId: { in: removedIds } },
            data: { copiedFromItemId: null },
          });
        }
        await tx.scopeItem.deleteMany({
          where: { quarterCardId: id, id: { notIn: [...incomingIds] } },
        });
        for (const item of dto.scope) {
          const weight = weights.get(item.weight_definition_id)!;
          if (item.id) {
            const updated = await tx.scopeItem.updateMany({
              where: {
                id: item.id,
                quarterCardId: id,
                revision: item.revision,
              },
              data: {
                text: item.text.trim(),
                statusCode: item.status_code,
                weightDefinitionId: weight.id,
                weightSnapshotName: weight.name,
                weightSnapshotValue: weight.weight,
                revision: { increment: 1 },
              },
            });
            if (!updated.count)
              await this.throwConflict(tx, "ScopeItem", item.id);
            const nextExecutorIds = unique(item.executor_department_ids);
            const currentExecutorIds = new Set(
              current.scopeItems
                .find((existing) => existing.id === item.id)
                ?.executors.map((link) => link.departmentId) ?? [],
            );
            await this.syncScopeExecutors(
              tx,
              item.id,
              nextExecutorIds,
              currentExecutorIds,
            );
          } else {
            await tx.scopeItem.create({
              data: {
                quarterCardId: id,
                lineageId: item.lineage_id ?? randomUUID(),
                text: item.text.trim(),
                statusCode: item.status_code,
                weightDefinitionId: weight.id,
                weightSnapshotName: weight.name,
                weightSnapshotValue: weight.weight,
                executors: {
                  createMany: {
                    data: unique(item.executor_department_ids).map(
                      (departmentId) => ({ departmentId }),
                    ),
                  },
                },
              },
            });
          }
        }
        const executorIds = dto.scope.flatMap(
          (item) => item.executor_department_ids,
        );
        await this.replaceCardDepartments(
          tx,
          id,
          unique([...dto.department_ids, ...executorIds]),
        );
        await this.replaceCustomFields(
          tx,
          id,
          current.initiativeYear.initiative.kind,
          dto.custom_fields ?? {},
        );
        await this.recalculateCard(tx, id);
        await this.audit(
          tx,
          "QuarterCard",
          id,
          "CARD_UPDATED",
          "Оновлено квартальну картку",
          actor,
        );
        return { card_id: id, card_revision: dto.revision + 1 };
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
    );
    return ok("Картку збережено", result);
  }

  async updateCardStatus(
    id: string,
    dto: UpdateCardStatusDto,
    actor: AuthUser,
  ) {
    const current = await this.prisma.quarterCard.findUnique({
      where: { id },
      include: { initiativeYear: true },
    });
    if (!current) throw this.notFound("Картку");
    if (isPeriodLocked(current.initiativeYear.year, qs(current.quarter)))
      await this.assertCanEditArchive(actor);
    else await this.assertCanEdit(actor);

    const card = await this.prisma.$transaction(
      async (tx) => {
        await this.assertCardStatus(tx, dto.status_id);
        const changed = await tx.quarterCard.updateMany({
          where: { id, revision: dto.revision },
          data: { statusId: dto.status_id, revision: { increment: 1 } },
        });
        if (!changed.count) await this.throwConflict(tx, "QuarterCard", id);
        await this.audit(
          tx,
          "QuarterCard",
          id,
          "CARD_STATUS_UPDATED",
          "Оновлено статус квартальної картки",
          actor,
        );
        return tx.quarterCard.findUniqueOrThrow({
          where: { id },
          include: cardInclude,
        });
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
    );
    return ok("Статус картки оновлено", mapCard(card));
  }

  async updateArchivedCard(
    id: string,
    dto: UpdateArchivedCardDto,
    actor: AuthUser,
  ) {
    await this.assertCanEditArchive(actor);
    const result = await this.prisma.$transaction(
      async (tx) => {
        const current = await tx.quarterCard.findUnique({
          where: { id },
          include: { initiativeYear: true, scopeItems: true },
        });
        if (!current) throw this.notFound("Картку");
        if (!isPeriodLocked(current.initiativeYear.year, qs(current.quarter))) {
          throw new AppError(
            "PERIOD_NOT_ARCHIVED",
            "Для відкритого періоду використовуйте звичайне редагування.",
            HttpStatus.BAD_REQUEST,
          );
        }
        if (dto.status_id) await this.assertCardStatus(tx, dto.status_id);
        const changed = await tx.quarterCard.updateMany({
          where: { id, revision: dto.revision },
          data: {
            ...(dto.notes !== undefined
              ? { notes: sanitizeRichText(dto.notes) || null }
              : {}),
            ...(dto.status_id ? { statusId: dto.status_id } : {}),
            revision: { increment: 1 },
          },
        });
        if (!changed.count) await this.throwConflict(tx, "QuarterCard", id);
        const currentIds = new Set(current.scopeItems.map((item) => item.id));
        for (const item of dto.scope_status_updates) {
          if (!currentIds.has(item.id)) throw this.notFound("Завдання scope");
          const updated = await tx.scopeItem.updateMany({
            where: { id: item.id, quarterCardId: id, revision: item.revision },
            data: { statusCode: item.status_code, revision: { increment: 1 } },
          });
          if (!updated.count)
            await this.throwConflict(tx, "ScopeItem", item.id);
        }
        await this.audit(
          tx,
          "QuarterCard",
          id,
          "ARCHIVED_CARD_STATUS_UPDATED",
          "Оновлено дозволені поля архівної картки",
          actor,
        );
        return { card_id: id, card_revision: dto.revision + 1 };
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
    );
    return ok("Архівну картку оновлено", result);
  }

  async extendYears(dto: ExtendYearsDto, actor: AuthUser) {
    await this.assertCanEdit(actor);
    const result = await this.prisma.$transaction(
      async (tx) => {
        const created: Array<{
          source_year_id: string;
          target_year_id: string;
          revision: number;
        }> = [];
        for (const sourceDto of dto.source_years) {
          const source = await tx.initiativeYear.findUnique({
            where: { id: sourceDto.id },
            include: {
              preparationStage: { include: { departments: true } },
              quarterCards: {
                include: {
                  departments: true,
                  scopeItems: { include: { executors: true } },
                },
                orderBy: { quarter: "desc" },
              },
            },
          });
          if (!source) throw this.notFound("Вихідний рік");
          await this.assertAggregateRevision(
            tx,
            "InitiativeYear",
            source.id,
            sourceDto.revision,
          );
          if (dto.target_year !== source.year + 1) {
            throw new AppError(
              "INVALID_EXTENSION_YEAR",
              "Ініціативу можна продовжити лише на наступний рік.",
              HttpStatus.BAD_REQUEST,
              { source_year: source.year, target_year: dto.target_year },
            );
          }
          const existing = await tx.initiativeYear.findUnique({
            where: {
              initiativeId_year: {
                initiativeId: source.initiativeId,
                year: dto.target_year,
              },
            },
          });
          if (existing)
            throw new AppError(
              "YEAR_ALREADY_EXISTS",
              "Ініціативу вже продовжено на обраний рік.",
              HttpStatus.CONFLICT,
              { initiative_year_id: existing.id },
            );
          const latest = source.quarterCards[0];
          const defaults: Defaults = latest
            ? {
                managerId: latest.managerId,
                priorityId: latest.priorityId,
                departmentIds: this.effectiveDepartmentIds(latest),
              }
            : {
                managerId: source.preparationStage?.managerId ?? null,
                priorityId: source.preparationStage?.priorityId ?? null,
                departmentIds:
                  source.preparationStage?.departments.map(
                    (item) => item.departmentId,
                  ) ?? [],
              };
          const target = await this.createYear(
            tx,
            source.initiativeId,
            dto.target_year,
            defaults,
          );
          await this.audit(
            tx,
            "InitiativeYear",
            target.id,
            "YEAR_EXTENDED",
            "Ініціативу продовжено на наступний рік",
            actor,
            source.year,
            undefined,
            dto.target_year,
          );
          created.push({
            source_year_id: source.id,
            target_year_id: target.id,
            revision: target.revision,
          });
        }
        return { years: created };
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
    );
    return ok("Ініціативи продовжено", result);
  }

  async moveCard(id: string, dto: PeriodCommandDto, actor: AuthUser) {
    await this.assertCanEdit(actor);
    const result = await this.prisma.$transaction(
      async (tx) => {
        const source = await tx.quarterCard.findUnique({
          where: { id },
          include: {
            initiativeYear: { include: { initiative: true } },
            departments: true,
            scopeItems: { include: { executors: true } },
          },
        });
        if (!source) throw this.notFound("Картку");
        if (isPeriodLocked(source.initiativeYear.year, qs(source.quarter)))
          throw this.archived();
        this.assertOpen(dto.to_year, dto.to_quarter);
        if (
          source.initiativeYear.year === dto.to_year &&
          source.quarter === qn(dto.to_quarter)
        ) {
          throw new AppError(
            "SAME_TARGET_PERIOD",
            "Оберіть інший квартал.",
            HttpStatus.BAD_REQUEST,
          );
        }
        const targetYear = await this.ensureYearFromCard(
          tx,
          source,
          dto.to_year,
        );
        const occupied = await tx.quarterCard.findUnique({
          where: {
            initiativeYearId_quarter: {
              initiativeYearId: targetYear.id,
              quarter: qn(dto.to_quarter),
            },
          },
        });
        if (occupied && occupied.id !== id) throw this.targetOccupied();
        const defaultStatus = await this.defaultCardStatus(tx);
        const changed = await tx.quarterCard.updateMany({
          where: { id, revision: dto.revision },
          data: {
            initiativeYearId: targetYear.id,
            quarter: qn(dto.to_quarter),
            statusId: defaultStatus.id,
            movedFromYear: source.initiativeYear.year,
            movedFromQuarter: source.quarter,
            revision: { increment: 1 },
          },
        });
        if (!changed.count) await this.throwConflict(tx, "QuarterCard", id);
        await this.audit(
          tx,
          "QuarterCard",
          id,
          "CARD_MOVED",
          "Квартальну картку перенесено",
          actor,
          source.initiativeYear.year,
          qs(source.quarter),
          dto.to_year,
          dto.to_quarter,
        );
        return {
          card_id: id,
          card_revision: dto.revision + 1,
          source_year_id: source.initiativeYearId,
          target_year_id: targetYear.id,
        };
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
    );
    return ok("Картку перенесено", result);
  }

  async continueCard(id: string, dto: PeriodCommandDto, actor: AuthUser) {
    await this.assertCanEdit(actor);
    const result = await this.prisma.$transaction(
      async (tx) => {
        const source = await tx.quarterCard.findUnique({
          where: { id },
          include: {
            initiativeYear: { include: { initiative: true } },
            departments: true,
            scopeItems: { include: { executors: true } },
            customFieldValues: {
              include: { definition: { select: { fieldType: true } } },
            },
          },
        });
        if (!source) throw this.notFound("Картку");
        await this.assertAggregateRevision(tx, "QuarterCard", id, dto.revision);
        this.assertOpen(dto.to_year, dto.to_quarter);
        if (
          dto.to_year * 10 + qn(dto.to_quarter) <=
          source.initiativeYear.year * 10 + source.quarter
        ) {
          throw new AppError(
            "INVALID_CONTINUATION_PERIOD",
            "Продовження можливе лише у пізніший квартал.",
            HttpStatus.BAD_REQUEST,
          );
        }
        const targetYear = await this.ensureYearFromCard(
          tx,
          source,
          dto.to_year,
        );
        const occupied = await tx.quarterCard.findUnique({
          where: {
            initiativeYearId_quarter: {
              initiativeYearId: targetYear.id,
              quarter: qn(dto.to_quarter),
            },
          },
        });
        if (occupied) throw this.targetOccupied();
        const card = await this.createEmptyCard(
          tx,
          targetYear.id,
          qn(dto.to_quarter),
          {
            managerId: source.managerId,
            priorityId: source.priorityId,
            departmentIds: this.effectiveDepartmentIds(source),
          },
          source.notes,
        );
        if (source.customFieldValues.length) {
          await tx.customFieldValue.createMany({
            data: source.customFieldValues.map((value) => ({
              quarterCardId: card.id,
              definitionId: value.definitionId,
              textValue:
                value.definition.fieldType === "RICHTEXT" && value.textValue
                  ? sanitizeRichText(value.textValue)
                  : value.textValue,
              numberValue: value.numberValue,
              booleanValue: value.booleanValue,
              dateValue: value.dateValue,
              optionValue: value.optionValue,
            })),
          });
        }
        await this.audit(
          tx,
          "QuarterCard",
          card.id,
          "CARD_CONTINUED",
          "Ініціативу продовжено в інший квартал",
          actor,
          source.initiativeYear.year,
          qs(source.quarter),
          dto.to_year,
          dto.to_quarter,
        );
        return {
          source_card_id: id,
          target_card_id: card.id,
          target_card_revision: card.revision,
          target_year_id: targetYear.id,
        };
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
    );
    return ok("Ініціативу продовжено", result);
  }

  async moveScope(
    cardId: string,
    itemId: string,
    dto: PeriodCommandDto,
    actor: AuthUser,
  ) {
    return this.transferScope("MOVE", cardId, itemId, dto, actor);
  }

  async copyScope(
    cardId: string,
    itemId: string,
    dto: PeriodCommandDto,
    actor: AuthUser,
  ) {
    return this.transferScope("COPY", cardId, itemId, dto, actor);
  }

  async removeCard(id: string, revision: number, actor: AuthUser) {
    await this.assertCanDelete(actor);
    const result = await this.prisma.$transaction(
      async (tx) => {
        const card = await tx.quarterCard.findUnique({
          where: { id },
          include: {
            initiativeYear: true,
            scopeItems: { select: { statusCode: true } },
          },
        });
        if (!card) throw this.notFound("Картку");
        if (isPeriodLocked(card.initiativeYear.year, qs(card.quarter)))
          throw this.archived();
        if (card.scopeItems.some((item) => item.statusCode === "GREEN")) {
          throw new AppError(
            "CARD_HAS_COMPLETED_SCOPE",
            "Квартальну картку не можна видалити, оскільки вона містить завершені завдання.",
            HttpStatus.CONFLICT,
          );
        }
        await this.detachCardMetadata(tx, [id]);
        const deleted = await tx.quarterCard.deleteMany({
          where: { id, revision },
        });
        if (!deleted.count) await this.throwConflict(tx, "QuarterCard", id);
        await this.audit(
          tx,
          "QuarterCard",
          id,
          "CARD_DELETED",
          "Квартальну картку видалено",
          actor,
        );
        return { card_id: id, year_id: card.initiativeYearId };
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
    );
    return ok("Картку видалено", result);
  }

  async removeYear(id: string, revision: number, actor: AuthUser) {
    await this.assertCanDelete(actor);
    const result = await this.prisma.$transaction(
      async (tx) => {
        const year = await tx.initiativeYear.findUnique({
          where: { id },
          include: { quarterCards: { select: { id: true, quarter: true } } },
        });
        if (!year) throw this.notFound("Рік ініціативи");
        if (year.quarterCards.length) {
          throw new AppError(
            "YEAR_HAS_QUARTER_CARDS",
            "Запис беклогу не можна видалити, доки для нього існують квартальні картки.",
            HttpStatus.CONFLICT,
          );
        }
        const deleted = await tx.initiativeYear.deleteMany({
          where: { id, revision },
        });
        if (!deleted.count) await this.throwConflict(tx, "InitiativeYear", id);
        const remaining = await tx.initiativeYear.count({
          where: { initiativeId: year.initiativeId },
        });
        if (!remaining)
          await tx.initiative.delete({ where: { id: year.initiativeId } });
        await this.audit(
          tx,
          "InitiativeYear",
          id,
          "YEAR_DELETED",
          "Рік ініціативи видалено",
          actor,
        );
        return {
          year_id: id,
          initiative_id: year.initiativeId,
          initiative_deleted: remaining === 0,
        };
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
    );
    return ok("Рік ініціативи видалено", result);
  }

  private async transferScope(
    mode: "MOVE" | "COPY",
    cardId: string,
    itemId: string,
    dto: PeriodCommandDto,
    actor: AuthUser,
  ) {
    await this.assertCanEdit(actor);
    const result = await this.prisma.$transaction(
      async (tx) => {
        const source = await tx.quarterCard.findUnique({
          where: { id: cardId },
          include: {
            initiativeYear: { include: { initiative: true } },
            departments: true,
            scopeItems: { include: { executors: true } },
            customFieldValues: {
              include: { definition: { select: { fieldType: true } } },
            },
          },
        });
        if (!source) throw this.notFound("Картку");
        await this.assertAggregateRevision(
          tx,
          "QuarterCard",
          cardId,
          dto.revision,
        );
        if (
          mode === "MOVE" &&
          isPeriodLocked(source.initiativeYear.year, qs(source.quarter))
        )
          throw this.archived();
        this.assertOpen(dto.to_year, dto.to_quarter);
        const item = source.scopeItems.find(
          (candidate) => candidate.id === itemId,
        );
        if (!item) throw this.notFound("Завдання скоупу");
        if (item.statusCode === "GREEN")
          throw new AppError(
            "COMPLETED_SCOPE_IMMUTABLE",
            "Виконане завдання не можна переносити або копіювати.",
            HttpStatus.CONFLICT,
          );
        const targetYear = await this.ensureYearFromCard(
          tx,
          source,
          dto.to_year,
        );
        let target = await tx.quarterCard.findUnique({
          where: {
            initiativeYearId_quarter: {
              initiativeYearId: targetYear.id,
              quarter: qn(dto.to_quarter),
            },
          },
          include: { departments: true },
        });
        const targetExisted = Boolean(target);
        if (target?.id === source.id)
          throw new AppError(
            "SAME_TARGET_PERIOD",
            "Оберіть інший квартал.",
            HttpStatus.BAD_REQUEST,
          );
        if (
          target &&
          dto.target_revision !== undefined &&
          target.revision !== dto.target_revision
        ) {
          throw this.conflict(target.revision, "QuarterCard", target.id);
        }
        if (!target) {
          target = await this.createEmptyCard(
            tx,
            targetYear.id,
            qn(dto.to_quarter),
            {
              managerId: source.managerId,
              priorityId: source.priorityId,
              departmentIds: unique([
                ...this.effectiveDepartmentIds(source),
                ...item.executors.map((link) => link.departmentId),
              ]),
            },
            source.notes,
          );
          if (source.customFieldValues.length) {
            await tx.customFieldValue.createMany({
              data: source.customFieldValues.map((value) => ({
                quarterCardId: target!.id,
                definitionId: value.definitionId,
                textValue:
                  value.definition.fieldType === "RICHTEXT" && value.textValue
                    ? sanitizeRichText(value.textValue)
                    : value.textValue,
                numberValue: value.numberValue,
                booleanValue: value.booleanValue,
                dateValue: value.dateValue,
                optionValue: value.optionValue,
              })),
            });
          }
        }
        const duplicate = await tx.scopeItem.findUnique({
          where: {
            quarterCardId_lineageId: {
              quarterCardId: target.id,
              lineageId: item.lineageId,
            },
          },
        });
        if (duplicate)
          throw new AppError(
            "SCOPE_LINEAGE_CONFLICT",
            "Це завдання вже існує у цільовій картці.",
            HttpStatus.CONFLICT,
            { scope_item_id: duplicate.id, target_card_id: target.id },
          );

        let createdScopeItemId: string | undefined;
        if (mode === "MOVE") {
          const sourceChanged = await tx.quarterCard.updateMany({
            where: { id: source.id, revision: dto.revision },
            data: { revision: { increment: 1 } },
          });
          if (!sourceChanged.count)
            await this.throwConflict(tx, "QuarterCard", source.id);
          const moved = await tx.scopeItem.updateMany({
            where: {
              id: item.id,
              quarterCardId: source.id,
              revision: item.revision,
            },
            data: {
              quarterCardId: target.id,
              movedFromCardId: source.id,
              revision: { increment: 1 },
            },
          });
          if (!moved.count) await this.throwConflict(tx, "ScopeItem", item.id);
        } else {
          const defaultWeight = await this.defaultWeight(tx);
          const copied = await tx.scopeItem.create({
            data: {
              quarterCardId: target.id,
              lineageId: item.lineageId,
              copiedFromItemId: item.id,
              text: item.text,
              statusCode: "DEFAULT",
              weightDefinitionId: defaultWeight.id,
              weightSnapshotName: defaultWeight.name,
              weightSnapshotValue: defaultWeight.weight,
              executors: {
                createMany: {
                  data: item.executors.map((link) => ({
                    departmentId: link.departmentId,
                  })),
                },
              },
            },
          });
          createdScopeItemId = copied.id;
        }
        if (targetExisted) {
          if (dto.target_revision === undefined) {
            throw new AppError(
              "TARGET_REVISION_REQUIRED",
              "Оновіть цільову картку перед зміною її скоупу.",
              HttpStatus.CONFLICT,
              { target_card_id: target.id, actual_revision: target.revision },
            );
          }
          const targetChanged = await tx.quarterCard.updateMany({
            where: { id: target.id, revision: dto.target_revision },
            data: { revision: { increment: 1 } },
          });
          if (!targetChanged.count)
            await this.throwConflict(tx, "QuarterCard", target.id);
        }
        await this.replaceCardDepartments(
          tx,
          target.id,
          unique([
            ...target.departments.map((link) => link.departmentId),
            ...item.executors.map((link) => link.departmentId),
          ]),
        );
        if (mode === "MOVE") await this.recalculateCard(tx, source.id);
        await this.recalculateCard(tx, target.id);
        await this.audit(
          tx,
          "ScopeItem",
          item.id,
          mode === "MOVE" ? "SCOPE_MOVED" : "SCOPE_COPIED",
          mode === "MOVE"
            ? "Завдання скоупу перенесено"
            : "Завдання скоупу скопійовано",
          actor,
          source.initiativeYear.year,
          qs(source.quarter),
          dto.to_year,
          dto.to_quarter,
        );
        await this.audit(
          tx,
          "QuarterCard",
          source.id,
          mode === "MOVE" ? "SCOPE_MOVED_OUT" : "SCOPE_COPIED_OUT",
          mode === "MOVE"
            ? "Із картки перенесено завдання scope"
            : "Із картки скопійовано завдання scope",
          actor,
          source.initiativeYear.year,
          qs(source.quarter),
          dto.to_year,
          dto.to_quarter,
        );
        if (target.id !== source.id)
          await this.audit(
            tx,
            "QuarterCard",
            target.id,
            mode === "MOVE" ? "SCOPE_MOVED_IN" : "SCOPE_COPIED_IN",
            mode === "MOVE"
              ? "До картки перенесено завдання scope"
              : "До картки скопійовано завдання scope",
            actor,
            source.initiativeYear.year,
            qs(source.quarter),
            dto.to_year,
            dto.to_quarter,
          );
        return {
          source_card_id: source.id,
          target_card_id: target.id,
          scope_item_id: createdScopeItemId ?? item.id,
          source_card_revision: source.revision + (mode === "MOVE" ? 1 : 0),
          target_card_revision: target.revision + (targetExisted ? 1 : 0),
        };
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
    );
    return ok(
      mode === "MOVE" ? "Завдання перенесено" : "Завдання скопійовано",
      result,
    );
  }

  private async assertAggregateRevision(
    tx: Tx,
    aggregateType: "InitiativeYear" | "QuarterCard",
    id: string,
    revision: number,
  ) {
    const delegate =
      aggregateType === "InitiativeYear" ? tx.initiativeYear : tx.quarterCard;
    const changed = await (delegate as any).updateMany({
      where: { id, revision },
      data: { revision: { increment: 0 } },
    });
    if (!changed.count) await this.throwConflict(tx, aggregateType, id);
  }

  private async createYear(
    tx: Tx,
    initiativeId: string,
    year: number,
    defaults: Defaults,
  ) {
    return tx.initiativeYear.create({
      data: {
        initiativeId,
        year,
        strategicGoal: null,
        preparationStage: {
          create: {
            managerId: defaults.managerId,
            priorityId: defaults.priorityId,
            departments: {
              createMany: {
                data: unique(defaults.departmentIds).map((departmentId) => ({
                  departmentId,
                })),
              },
            },
          },
        },
      },
    });
  }

  private async detachCardMetadata(tx: Tx, cardIds: string[]) {
    if (!cardIds.length) return;
    const scopeIds = (
      await tx.scopeItem.findMany({
        where: { quarterCardId: { in: cardIds } },
        select: { id: true },
      })
    ).map((item) => item.id);
    if (scopeIds.length)
      await tx.scopeItem.updateMany({
        where: { copiedFromItemId: { in: scopeIds } },
        data: { copiedFromItemId: null },
      });
    await tx.scopeItem.updateMany({
      where: { movedFromCardId: { in: cardIds } },
      data: { movedFromCardId: null },
    });
  }

  private async ensureYearFromCard(tx: Tx, source: any, targetYear: number) {
    const existing = await tx.initiativeYear.findUnique({
      where: {
        initiativeId_year: {
          initiativeId: source.initiativeYear.initiativeId,
          year: targetYear,
        },
      },
    });
    if (existing) return existing;
    return this.createYear(tx, source.initiativeYear.initiativeId, targetYear, {
      managerId: source.managerId,
      priorityId: source.priorityId,
      departmentIds: this.effectiveDepartmentIds(source),
    });
  }

  private async createEmptyCard(
    tx: Tx,
    yearId: string,
    quarter: number,
    defaults: Defaults,
    notes?: string | null,
  ) {
    const status = await this.defaultCardStatus(tx);
    return tx.quarterCard.create({
      data: {
        initiativeYearId: yearId,
        quarter,
        managerId: defaults.managerId,
        priorityId: defaults.priorityId,
        notes: notes ? sanitizeRichText(notes) || null : null,
        statusId: status.id,
        totalWeight: 0,
        sizeSnapshotName: "Не визначено",
        departments: {
          createMany: {
            data: unique(defaults.departmentIds).map((departmentId) => ({
              departmentId,
            })),
          },
        },
      },
      include: { departments: true },
    });
  }

  private async recalculateCard(tx: Tx, cardId: string) {
    const scope = await tx.scopeItem.findMany({
      where: { quarterCardId: cardId },
    });
    const total = scope.reduce(
      (sum, item) => sum + item.weightSnapshotValue.toNumber(),
      0,
    );
    const sizes = await tx.initiativeSize.findMany({
      where: { isActive: true },
      orderBy: { minScore: "asc" },
    });
    const definition = sizes.find(
      (size) =>
        total >= size.minScore.toNumber() && total <= size.maxScore.toNumber(),
    );
    await tx.quarterCard.update({
      where: { id: cardId },
      data: {
        totalWeight: total,
        sizeDefinitionId: definition?.id ?? null,
        sizeSnapshotName: definition?.name ?? "Не визначено",
        sizeSnapshotMin: definition?.minScore ?? null,
        sizeSnapshotMax: definition?.maxScore ?? null,
      },
    });
  }

  private async replacePreparationDepartments(
    tx: Tx,
    yearId: string,
    departmentIds: string[],
  ) {
    const ids = unique(departmentIds);
    await tx.preparationStageDepartment.deleteMany({
      where: { initiativeYearId: yearId, departmentId: { notIn: ids } },
    });
    const existing = await tx.preparationStageDepartment.findMany({
      where: { initiativeYearId: yearId, departmentId: { in: ids } },
      select: { departmentId: true },
    });
    const existingIds = new Set(existing.map((item) => item.departmentId));
    await tx.preparationStageDepartment.createMany({
      data: ids
        .filter((id) => !existingIds.has(id))
        .map((departmentId) => ({ initiativeYearId: yearId, departmentId })),
    });
  }

  private async syncScopeExecutors(
    tx: Tx,
    scopeItemId: string,
    nextExecutorIds: string[],
    currentExecutorIds: Set<string>,
  ) {
    await tx.scopeItemExecutor.deleteMany({
      where: { scopeItemId, departmentId: { notIn: nextExecutorIds } },
    });
    const addedExecutorIds = nextExecutorIds.filter(
      (departmentId) => !currentExecutorIds.has(departmentId),
    );
    if (addedExecutorIds.length) {
      await tx.scopeItemExecutor.createMany({
        data: addedExecutorIds.map((departmentId) => ({
          scopeItemId,
          departmentId,
        })),
      });
    }
  }

  private async replaceCardDepartments(
    tx: Tx,
    cardId: string,
    departmentIds: string[],
  ) {
    const ids = unique(departmentIds);
    await tx.quarterCardDepartment.deleteMany({
      where: { quarterCardId: cardId, departmentId: { notIn: ids } },
    });
    const existing = await tx.quarterCardDepartment.findMany({
      where: { quarterCardId: cardId, departmentId: { in: ids } },
      select: { departmentId: true },
    });
    const existingIds = new Set(existing.map((item) => item.departmentId));
    await tx.quarterCardDepartment.createMany({
      data: ids
        .filter((id) => !existingIds.has(id))
        .map((departmentId) => ({ quarterCardId: cardId, departmentId })),
    });
  }

  private async replaceCustomFields(
    tx: Tx,
    cardId: string,
    kind: string,
    values: Record<string, unknown>,
  ) {
    const presentValues = Object.fromEntries(
      Object.entries(values).filter(
        ([, value]) => value !== "" && value !== null && value !== undefined,
      ),
    );
    const definitionIds = Object.keys(presentValues);
    const entityType = kind === "PROJECT" ? "project" : "task";
    const definitions = definitionIds.length
      ? await tx.customFieldDefinition.findMany({
          where: { id: { in: definitionIds }, entityType, isActive: true },
          include: { options: true },
        })
      : [];
    if (definitions.length !== definitionIds.length)
      throw new AppError(
        "INVALID_CUSTOM_FIELD",
        "Одне або кілька додаткових полів недоступні для цього типу ініціативи.",
      );
    const required = await tx.customFieldDefinition.findMany({
      where: { entityType, isActive: true, isRequired: true },
      select: { id: true },
    });
    const missingRequired = required.some(
      ({ id }) => !Object.prototype.hasOwnProperty.call(presentValues, id),
    );
    if (missingRequired)
      throw new AppError(
        "REQUIRED_CUSTOM_FIELD",
        "Заповніть усі обов’язкові додаткові поля.",
      );
    await tx.customFieldValue.deleteMany({
      where: { quarterCardId: cardId, definitionId: { notIn: definitionIds } },
    });
    for (const definition of definitions) {
      const raw = presentValues[definition.id];
      if (
        definition.fieldType === "SELECT" &&
        !definition.options.some((option) => option.value === String(raw))
      ) {
        throw new AppError(
          "INVALID_CUSTOM_FIELD_OPTION",
          `Недопустиме значення поля «${definition.name}».`,
        );
      }
      const data = this.customFieldValue(definition.fieldType, raw);
      await tx.customFieldValue.upsert({
        where: {
          quarterCardId_definitionId: {
            quarterCardId: cardId,
            definitionId: definition.id,
          },
        },
        create: { quarterCardId: cardId, definitionId: definition.id, ...data },
        update: data,
      });
    }
  }

  private customFieldValue(type: string, value: unknown) {
    const empty = {
      textValue: null,
      numberValue: null,
      booleanValue: null,
      dateValue: null,
      optionValue: null,
    };
    switch (type) {
      case "NUMBER": {
        const parsed = Number(value);
        if (!Number.isFinite(parsed))
          throw new AppError(
            "INVALID_CUSTOM_FIELD",
            "Додаткове поле має містити число.",
          );
        return { ...empty, numberValue: parsed };
      }
      case "CHECKBOX":
        if (typeof value !== "boolean")
          throw new AppError(
            "INVALID_CUSTOM_FIELD",
            "Додаткове поле має містити логічне значення.",
          );
        return { ...empty, booleanValue: value };
      case "SELECT":
        return { ...empty, optionValue: String(value) };
      case "RICHTEXT":
        return { ...empty, textValue: sanitizeRichText(String(value)) };
      default:
        return { ...empty, textValue: String(value) };
    }
  }

  private async loadWeights(tx: Tx, ids: string[]) {
    const uniqueIds = unique(ids);
    const weights = await tx.taskWeight.findMany({
      where: { id: { in: uniqueIds }, isActive: true },
    });
    if (weights.length !== uniqueIds.length)
      throw new AppError(
        "INVALID_WEIGHT",
        "Оберіть активну вагу для кожного завдання.",
      );
    return new Map(weights.map((weight) => [weight.id, weight]));
  }

  private assertScopePayload(
    existing: Array<{ id: string; revision: number }>,
    incoming: UpdateCardDto["scope"],
  ) {
    const current = new Map(existing.map((item) => [item.id, item.revision]));
    const ids = incoming.flatMap((item) => (item.id ? [item.id] : []));
    if (new Set(ids).size !== ids.length)
      throw new AppError(
        "DUPLICATE_SCOPE_ITEM",
        "Завдання скоупу дублюється у запиті.",
      );
    for (const item of incoming) {
      if (item.id && !current.has(item.id))
        throw new AppError(
          "INVALID_SCOPE_ITEM",
          "Завдання не належить цій картці.",
        );
      if (item.id && !item.revision)
        throw new AppError(
          "REVISION_REQUIRED",
          "Для існуючого завдання потрібна актуальна версія.",
        );
      if (!item.text.trim())
        throw new AppError(
          "VALIDATION_ERROR",
          "Текст завдання не може бути порожнім.",
        );
      if (!item.executor_department_ids.length)
        throw new AppError(
          "VALIDATION_ERROR",
          "Оберіть хоча б один підрозділ-виконавець.",
        );
    }
  }

  private assertNewScopePayload(incoming: InitialQuarterCardDto["scope"]) {
    const lineages = incoming.flatMap((item) =>
      item.lineage_id ? [item.lineage_id] : [],
    );
    if (new Set(lineages).size !== lineages.length)
      throw new AppError(
        "DUPLICATE_SCOPE_ITEM",
        "Завдання скоупу дублюється у запиті.",
      );
    for (const item of incoming) {
      if (!item.text.trim())
        throw new AppError(
          "VALIDATION_ERROR",
          "Текст завдання не може бути порожнім.",
        );
      if (!item.executor_department_ids.length)
        throw new AppError(
          "VALIDATION_ERROR",
          "Оберіть хоча б один підрозділ-виконавець.",
        );
    }
  }

  private effectiveDepartmentIds(card: {
    departments: Array<{ departmentId: string }>;
    scopeItems: Array<{ executors: Array<{ departmentId: string }> }>;
  }) {
    const executors = new Set(
      card.scopeItems.flatMap((item) =>
        item.executors.map((link) => link.departmentId),
      ),
    );
    return card.departments
      .map((link) => link.departmentId)
      .filter((id) => !executors.has(id));
  }

  private async defaultCardStatus(tx: Tx) {
    const status = await tx.initiativeStatus.findUnique({
      where: { code: "DEFAULT" },
    });
    if (!status?.isActive)
      throw new AppError(
        "SYSTEM_DICTIONARY_MISSING",
        "Системний статус DEFAULT не налаштовано.",
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    return status;
  }

  private async defaultWeight(tx: Tx) {
    const weight = await tx.taskWeight.findFirst({
      where: { isDefault: true, isSystem: true, isActive: true },
    });
    if (!weight)
      throw new AppError(
        "SYSTEM_DICTIONARY_MISSING",
        "Системну вагу «Не визначено» не налаштовано.",
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    return weight;
  }

  private async assertCardStatus(tx: Tx, id: string) {
    const status = await tx.initiativeStatus.findFirst({
      where: { id, isActive: true },
    });
    if (!status)
      throw new AppError("INVALID_STATUS", "Оберіть активний статус картки.");
  }

  private async assertReferences(
    tx: Tx,
    managerId: string | undefined,
    priorityId: string | undefined,
    departmentIds: string[],
  ) {
    if (
      managerId &&
      !(await tx.manager.findFirst({
        where: { id: managerId, isActive: true },
        select: { id: true },
      }))
    ) {
      throw new AppError("INVALID_MANAGER", "Оберіть активного менеджера.");
    }
    if (
      priorityId &&
      !(await tx.priority.findFirst({
        where: { id: priorityId, isActive: true },
        select: { id: true },
      }))
    ) {
      throw new AppError("INVALID_PRIORITY", "Оберіть активний пріоритет.");
    }
    const ids = unique(departmentIds);
    if (
      ids.length &&
      (await tx.department.count({
        where: { id: { in: ids }, isActive: true },
      })) !== ids.length
    ) {
      throw new AppError(
        "INVALID_DEPARTMENT",
        "Один або кілька підрозділів недоступні.",
      );
    }
  }

  private async assertCanEdit(actor: AuthUser) {
    const permissions = await this.prisma.rolePermission.findUnique({
      where: { role: actor.role },
      include: { roleDefinition: true },
    });
    if (
      !permissions ||
      permissions.roleDefinition?.isActive === false ||
      permissions.isReadOnly ||
      !permissions.canCreateEditInitiatives
    )
      throw new AppError(
        "FORBIDDEN",
        "Недостатньо прав для зміни ініціатив.",
        HttpStatus.FORBIDDEN,
      );
  }

  private async assertCanDelete(actor: AuthUser) {
    const permissions = await this.prisma.rolePermission.findUnique({
      where: { role: actor.role },
      include: { roleDefinition: true },
    });
    if (
      !permissions ||
      permissions.roleDefinition?.isActive === false ||
      permissions.isReadOnly ||
      !permissions.canDeleteInitiatives
    )
      throw new AppError(
        "FORBIDDEN",
        "Недостатньо прав для видалення ініціатив.",
        HttpStatus.FORBIDDEN,
      );
  }

  private async assertCanEditArchive(actor: AuthUser) {
    const permissions = await this.prisma.rolePermission.findUnique({
      where: { role: actor.role },
      include: { roleDefinition: true },
    });
    if (
      !permissions ||
      permissions.roleDefinition?.isActive === false ||
      permissions.isReadOnly ||
      !permissions.canCreateEditInitiatives ||
      !permissions.canEditArchive
    ) {
      throw new AppError(
        "ARCHIVE_FORBIDDEN",
        "Недостатньо прав для редагування архівного періоду.",
        HttpStatus.FORBIDDEN,
      );
    }
  }

  private assertOpen(year: number, quarter: QuarterDto) {
    if (isPeriodLocked(year, quarter)) throw this.archived();
    const current = currentPeriod();
    if (year * 10 + qn(quarter) < current.year * 10 + qn(current.quarter))
      throw this.archived();
  }

  private yearLocked(year: number) {
    return isPeriodLocked(year, "Q4");
  }

  private targetOccupied() {
    return new AppError(
      "TARGET_CARD_OCCUPIED",
      "У цільовому кварталі вже існує картка цієї ініціативи.",
      HttpStatus.CONFLICT,
    );
  }

  private archived() {
    return new AppError(
      "ARCHIVED_PERIOD",
      "Архівний період не можна змінювати.",
      HttpStatus.CONFLICT,
    );
  }

  private notFound(label: string) {
    return new AppError(
      "NOT_FOUND",
      `${label} не знайдено.`,
      HttpStatus.NOT_FOUND,
    );
  }

  private conflict(
    actualRevision: number,
    aggregateType: string,
    aggregateId: string,
  ) {
    return new AppError(
      "REVISION_CONFLICT",
      "Запис уже змінено іншим користувачем. Оновіть дані.",
      HttpStatus.CONFLICT,
      {
        aggregate_id: aggregateId,
        aggregate_type: aggregateType,
        actual_revision: actualRevision,
      },
    );
  }

  private async throwConflict(
    tx: Tx,
    aggregateType:
      | "Initiative"
      | "InitiativeYear"
      | "QuarterCard"
      | "ScopeItem",
    id: string,
  ): Promise<never> {
    const delegate =
      aggregateType === "Initiative"
        ? tx.initiative
        : aggregateType === "InitiativeYear"
          ? tx.initiativeYear
          : aggregateType === "QuarterCard"
            ? tx.quarterCard
            : tx.scopeItem;
    const aggregate = await (delegate as any).findUnique({
      where: { id },
      select: { revision: true },
    });
    if (!aggregate) throw this.notFound("Агрегат");
    throw this.conflict(aggregate.revision, aggregateType, id);
  }

  private async throwPreparationConflict(tx: Tx, id: string): Promise<never> {
    const stage = await tx.preparationStage.findUnique({
      where: { initiativeYearId: id },
    });
    if (!stage) throw this.notFound("Підготовчий етап");
    throw this.conflict(stage.revision, "PreparationStage", id);
  }

  private async audit(
    tx: Tx,
    aggregateType: string,
    aggregateId: string,
    actionCode: string,
    message: string,
    actor: AuthUser,
    sourceYear?: number,
    sourceQuarter?: QuarterDto,
    targetYear?: number,
    targetQuarter?: QuarterDto,
  ) {
    await tx.auditEvent.create({
      data: {
        aggregateType,
        aggregateId,
        actionCode,
        message,
        actorUserId: actor.id,
        actorName: actor.name,
        sourceYear,
        sourceQuarter,
        targetYear,
        targetQuarter,
      },
    });
  }
}
