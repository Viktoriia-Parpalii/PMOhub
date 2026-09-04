import { Injectable } from "@nestjs/common";
import { PrismaService } from "../../../infrastructure/database/prisma.service";
import { AppError } from "../../../common/errors/app-error";
import { HttpStatus } from "@nestjs/common";
import { Prisma } from "../../../generated/prisma/client";
import {
  BacklogCardSummariesQueryDto,
  InitiativeYearCountsQueryDto,
  InitiativeYearsQueryDto,
  QuarterCardsQueryDto,
} from "../api/initiative.dto";
import {
  cardInclude,
  backlogCardSummaryInclude,
  cardSummaryInclude,
  mapBacklogCardSummary,
  mapCard,
  mapCardSummary,
  mapYear,
  yearInclude,
} from "../infrastructure/initiative.mapper";

const ok = <T>(message: string, data: T) => ({
  success: true as const,
  message,
  data,
});

@Injectable()
export class InitiativeQueryService {
  constructor(private readonly prisma: PrismaService) {}

  async listYears(query: InitiativeYearsQueryDto) {
    this.validateYear(query.year);
    const years = await this.prisma.initiativeYear.findMany({
      where: this.backlogWhere(query),
      include: yearInclude,
      orderBy: [{ year: "desc" }, { createdAt: "desc" }],
    });
    return ok("Роки ініціатив завантажено", years.map(mapYear));
  }

  async countYears(query: InitiativeYearCountsQueryDto) {
    this.validateYear(query.year);
    const [projectsFiltered, projectsTotal, tasksFiltered, tasksTotal] =
      await Promise.all([
        this.prisma.initiativeYear.count({
          where: this.backlogWhere({ ...query, kind: "PROJECT" }),
        }),
        this.prisma.initiativeYear.count({
          where: { year: query.year, initiative: { kind: "PROJECT" } },
        }),
        this.prisma.initiativeYear.count({
          where: this.backlogWhere({ ...query, kind: "OPERATIONAL_TASK" }),
        }),
        this.prisma.initiativeYear.count({
          where: {
            year: query.year,
            initiative: { kind: "OPERATIONAL_TASK" },
          },
        }),
      ]);
    return ok("Лічильники беклогу завантажено", {
      projects: { filtered: projectsFiltered, total: projectsTotal },
      operational_tasks: { filtered: tasksFiltered, total: tasksTotal },
    });
  }

  async availableYears() {
    const years = await this.prisma.initiativeYear.findMany({
      select: { year: true },
      distinct: ["year"],
      orderBy: { year: "asc" },
    });
    return ok(
      "Доступні роки беклогу завантажено",
      years.map((item) => item.year),
    );
  }

  async listCards(query: QuarterCardsQueryDto) {
    this.validateYear(query.year);
    if (query.quarter && !["Q1", "Q2", "Q3", "Q4"].includes(query.quarter)) {
      throw new AppError(
        "INVALID_QUARTER",
        "Невідомий квартал.",
        HttpStatus.BAD_REQUEST,
      );
    }
    const cards = await this.prisma.quarterCard.findMany({
      where: this.portfolioCardWhere(query),
      include: cardSummaryInclude,
      orderBy: [
        { initiativeYear: { year: "desc" } },
        { quarter: "asc" },
        { createdAt: "desc" },
      ],
    });
    return ok("Квартальні картки завантажено", cards.map(mapCardSummary));
  }

  async listBacklogCardSummaries(
    initiativeYearId: string,
    query: BacklogCardSummariesQueryDto = {},
  ) {
    const cards = await this.prisma.quarterCard.findMany({
      where: {
        initiativeYearId,
        managerId: query.manager_id,
        priorityId: query.priority_id,
      },
      include: backlogCardSummaryInclude,
      orderBy: [
        { initiativeYear: { year: "desc" } },
        { quarter: "asc" },
        { createdAt: "desc" },
      ],
    });
    return ok(
      "Квартальні картки беклогу завантажено",
      cards.map(mapBacklogCardSummary),
    );
  }

  async getYear(id: string) {
    const year = await this.prisma.initiativeYear.findUnique({
      where: { id },
      include: yearInclude,
    });
    if (!year)
      throw new AppError(
        "NOT_FOUND",
        "Рік ініціативи не знайдено.",
        HttpStatus.NOT_FOUND,
      );
    return ok("Рік ініціативи завантажено", mapYear(year));
  }

  async getCard(id: string) {
    const card = await this.prisma.quarterCard.findUnique({
      where: { id },
      include: cardInclude,
    });
    if (!card)
      throw new AppError(
        "NOT_FOUND",
        "Картку не знайдено.",
        HttpStatus.NOT_FOUND,
      );
    return ok("Картку завантажено", mapCard(card));
  }

  private kind(value: string) {
    const normalized = value.toUpperCase();
    if (!["PROJECT", "OPERATIONAL_TASK"].includes(normalized))
      throw new AppError("INVALID_KIND", "Невідомий тип ініціативи.");
    return normalized;
  }

  private normalizedText(value?: string) {
    const normalized = value?.trim();
    return normalized || undefined;
  }

  private portfolioCardWhere(
    query: QuarterCardsQueryDto,
  ): Prisma.QuarterCardWhereInput {
    const name = this.normalizedText(query.name);
    const strategicGoal = this.normalizedText(query.strategic_goal);
    return {
      quarter: query.quarter ? Number(query.quarter.slice(1)) : undefined,
      managerId: query.manager_id,
      priorityId: query.priority_id,
      initiativeYear: {
        year: query.year,
        strategicGoal: strategicGoal ? { contains: strategicGoal } : undefined,
        initiative: {
          kind: query.kind ? this.kind(query.kind) : undefined,
          name: name ? { contains: name } : undefined,
        },
      },
    };
  }

  private backlogWhere(
    query: InitiativeYearsQueryDto,
  ): Prisma.InitiativeYearWhereInput {
    const name = this.normalizedText(query.name);
    const strategicGoal = this.normalizedText(query.strategic_goal);
    const hasCardFilters = Boolean(
      query.quarter || query.manager_id || query.priority_id,
    );
    const cardWhere: Prisma.QuarterCardWhereInput = {
      quarter: query.quarter ? Number(query.quarter.slice(1)) : undefined,
      managerId: query.manager_id,
      priorityId: query.priority_id,
    };
    const cardOrPreparation: Prisma.InitiativeYearWhereInput["OR"] =
      hasCardFilters
        ? [
            { quarterCards: { some: cardWhere } },
            ...(!query.quarter && (query.manager_id || query.priority_id)
              ? [
                  {
                    quarterCards: { none: {} },
                    preparationStage: {
                      is: {
                        managerId: query.manager_id,
                        priorityId: query.priority_id,
                      },
                    },
                  } satisfies Prisma.InitiativeYearWhereInput,
                ]
              : []),
          ]
        : undefined;
    return {
      year: query.year,
      strategicGoal: strategicGoal ? { contains: strategicGoal } : undefined,
      initiative: {
        kind: query.kind ? this.kind(query.kind) : undefined,
        name: name ? { contains: name } : undefined,
      },
      OR: cardOrPreparation,
    };
  }

  private validateYear(year?: number) {
    if (
      year !== undefined &&
      (!Number.isInteger(year) || year < 2000 || year > 2200)
    ) {
      throw new AppError(
        "INVALID_YEAR",
        "Некоректний рік.",
        HttpStatus.BAD_REQUEST,
      );
    }
  }
}
