import { Injectable } from "@nestjs/common";
import { PrismaService } from "../../../infrastructure/database/prisma.service";
import { AppError } from "../../../common/errors/app-error";
import { HttpStatus } from "@nestjs/common";
import { Prisma } from "../../../generated/prisma/client";
import {
  BacklogCardSummariesQueryDto,
  DepartmentRelationDto,
  InitiativeRelationCandidatesQueryDto,
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

  async relationCandidates(query: InitiativeRelationCandidatesQueryDto) {
    const search = query.query.trim();
    if (search.length < 2) {
      throw new AppError(
        "RELATION_SEARCH_TOO_SHORT",
        "Введіть щонайменше два символи для пошуку.",
        HttpStatus.BAD_REQUEST,
      );
    }
    const escaped = search.replace(/[~%_\[]/g, (value) => `~${value}`);
    const contains = `%${escaped}%`;
    const startsWith = `${escaped}%`;
    const conditions: Prisma.Sql[] = [
      Prisma.sql`LOWER([name]) LIKE LOWER(${contains}) ESCAPE N'~'`,
    ];
    if (query.kind) conditions.push(Prisma.sql`[kind] = ${query.kind}`);
    if (query.exclude_initiative_id) {
      conditions.push(Prisma.sql`[id] <> ${query.exclude_initiative_id}`);
    }
    const ranked = await this.prisma.$queryRaw<Array<{ id: string }>>(
      Prisma.sql`
        SELECT TOP (${query.limit ?? 20}) [id]
        FROM [initiatives]
        WHERE ${Prisma.join(conditions, " AND ")}
        ORDER BY
          CASE
            WHEN LOWER([name]) = LOWER(${search}) THEN 0
            WHEN LOWER([name]) LIKE LOWER(${startsWith}) ESCAPE N'~' THEN 1
            ELSE 2
          END,
          [name] ASC,
          [id] ASC
      `,
    );
    if (!ranked.length) return ok("Кандидатів не знайдено", []);
    const candidates = await this.prisma.initiative.findMany({
      where: { id: { in: ranked.map((item) => item.id) } },
      include: {
        years: { select: { year: true }, orderBy: { year: "desc" } },
        relationsAsLeft: {
          where: { relationType: "RELATED_INITIATIVE" },
          select: {
            id: true,
            revision: true,
            rightInitiativeId: true,
          },
        },
        relationsAsRight: {
          where: { relationType: "RELATED_INITIATIVE" },
          select: {
            id: true,
            revision: true,
            leftInitiativeId: true,
          },
        },
      },
    });
    const byId = new Map(candidates.map((candidate) => [candidate.id, candidate]));
    return ok(
      "Кандидатів завантажено",
      ranked.flatMap(({ id }) => {
        const candidate = byId.get(id);
        if (!candidate) return [];
        const relation = query.exclude_initiative_id
          ? [
              ...candidate.relationsAsLeft.filter(
                (item) => item.rightInitiativeId === query.exclude_initiative_id,
              ),
              ...candidate.relationsAsRight.filter(
                (item) => item.leftInitiativeId === query.exclude_initiative_id,
              ),
            ][0]
          : undefined;
        return [
          {
            initiative_id: candidate.id,
            kind: candidate.kind,
            name: candidate.name,
            available_years: candidate.years.map((item) => item.year),
            relation_id: relation?.id ?? null,
            relation_revision: relation?.revision ?? null,
          },
        ];
      }),
    );
  }

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
        { id: "asc" },
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
      cards.map((card) =>
        mapBacklogCardSummary(card, query.department_id),
      ),
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
    const departmentWhere = this.departmentCardWhere(
      query.department_id,
      query.department_relation ?? "ANY",
    );
    return {
      AND: departmentWhere ? [departmentWhere] : undefined,
      quarter: query.quarter ? Number(query.quarter.slice(1)) : undefined,
      managerId: query.manager_id,
      priorityId: query.priority_id,
      statusId: query.status_id,
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
      query.quarter ||
        query.manager_id ||
        query.priority_id ||
        query.department_id,
    );
    const cardWhere: Prisma.QuarterCardWhereInput = {
      quarter: query.quarter ? Number(query.quarter.slice(1)) : undefined,
      managerId: query.manager_id,
      priorityId: query.priority_id,
      AND: query.department_id
        ? [this.departmentCardWhere(query.department_id, "ANY")!]
        : undefined,
    };
    const cardOrPreparation: Prisma.InitiativeYearWhereInput["OR"] =
      hasCardFilters
        ? [
            { quarterCards: { some: cardWhere } },
            ...(!query.quarter &&
            !query.department_id &&
            (query.manager_id || query.priority_id)
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

  private departmentCardWhere(
    departmentId: string | undefined,
    relation: DepartmentRelationDto,
  ): Prisma.QuarterCardWhereInput | undefined {
    if (!departmentId) return undefined;
    const executor: Prisma.QuarterCardWhereInput = {
      scopeItems: {
        some: { executors: { some: { departmentId } } },
      },
    };
    const involved: Prisma.QuarterCardWhereInput = {
      AND: [
        { departments: { some: { departmentId } } },
        {
          scopeItems: {
            none: { executors: { some: { departmentId } } },
          },
        },
      ],
    };
    if (relation === "EXECUTOR") return executor;
    if (relation === "INVOLVED") return involved;
    return { OR: [executor, involved] };
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
