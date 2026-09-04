import { HttpStatus, Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { AppError } from "../../common/errors/app-error";
import { Prisma, PrismaClient } from "../../generated/prisma/client";
import { PrismaService } from "../../infrastructure/database/prisma.service";
import {
  ExportAvailabilityQueryDto,
  ExportKind,
  InitiativeExportFilterDto,
} from "./export.dto";

const YEAR_INCLUDE = {
  initiative: true,
  preparationStage: {
    include: {
      manager: true,
      priority: true,
      departments: { include: { department: true } },
    },
  },
  quarterCards: {
    select: {
      id: true,
      quarter: true,
      status: { select: { id: true, code: true, name: true, color: true } },
    },
    orderBy: { quarter: "asc" as const },
  },
} satisfies Prisma.InitiativeYearInclude;

const CARD_INCLUDE = {
  initiativeYear: { include: { initiative: true } },
  manager: true,
  priority: true,
  status: true,
  sizeDefinition: true,
  departments: { include: { department: true } },
  scopeItems: {
    include: {
      weightDefinition: true,
      executors: { include: { department: true } },
    },
    orderBy: { createdAt: "asc" as const },
  },
  customFieldValues: { include: { definition: true } },
} satisfies Prisma.QuarterCardInclude;

export type ExportYear = Prisma.InitiativeYearGetPayload<{
  include: typeof YEAR_INCLUDE;
}>;
export type ExportCard = Prisma.QuarterCardGetPayload<{
  include: typeof CARD_INCLUDE;
}>;
export type ExportCustomField = Prisma.CustomFieldDefinitionGetPayload<{
  include: { options: true };
}>;

export interface InitiativeExportDataset {
  years: ExportYear[];
  cards: ExportCard[];
  customFields: ExportCustomField[];
  departments: Array<{
    id: string;
    name: string;
    capacityLimitPoints: Prisma.Decimal;
  }>;
}

const quarterNumbers = (periods: InitiativeExportFilterDto["periods"]) =>
  periods
    .filter((period) => period !== "BACKLOG")
    .map((period) => Number(period.slice(1)));

const entityTypes = (kinds: ExportKind[]) =>
  kinds.map((kind) => (kind === "PROJECT" ? "project" : "task"));

@Injectable()
export class InitiativeExportQueryService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
  ) {}

  validateFilter(filter: InitiativeExportFilterDto) {
    if (filter.years.from > filter.years.to) {
      throw new AppError(
        "INVALID_EXPORT_YEAR_RANGE",
        "Початковий рік не може бути більшим за кінцевий",
      );
    }
  }

  async availability(query: ExportAvailabilityQueryDto) {
    const kinds = query.kinds?.length ? query.kinds : undefined;
    const [years, cards, customFields] = await Promise.all([
      this.prisma.initiativeYear.findMany({
        where: { initiative: kinds ? { kind: { in: kinds } } : undefined },
        select: { year: true, initiative: { select: { kind: true } } },
        orderBy: { year: "asc" },
      }),
      this.prisma.quarterCard.findMany({
        where: { initiativeYear: { initiative: kinds ? { kind: { in: kinds } } : undefined } },
        select: {
          quarter: true,
          initiativeYear: { select: { year: true, initiative: { select: { kind: true } } } },
        },
      }),
      query.include_custom_fields
        ? this.prisma.customFieldDefinition.findMany({
            where: kinds ? { entityType: { in: entityTypes(kinds) } } : undefined,
            orderBy: [{ entityType: "asc" }, { name: "asc" }],
          })
        : [],
    ]);
    const byYear: Record<string, { backlog: number; quarter_cards: number }> = {};
    for (const row of years) {
      const bucket = (byYear[row.year] ??= { backlog: 0, quarter_cards: 0 });
      bucket.backlog += 1;
    }
    for (const row of cards) {
      const bucket = (byYear[row.initiativeYear.year] ??= {
        backlog: 0,
        quarter_cards: 0,
      });
      bucket.quarter_cards += 1;
    }
    return {
      years: [...new Set(years.map((item) => item.year))],
      counts: byYear,
      custom_fields: customFields.map((field) => ({
        id: field.id,
        name: field.name,
        entity_type: field.entityType,
        field_type: field.fieldType,
        is_active: field.isActive,
      })),
    };
  }

  async preview(filter: InitiativeExportFilterDto) {
    this.validateFilter(filter);
    const includeBacklog = filter.periods.includes("BACKLOG");
    const quarters = quarterNumbers(filter.periods);
    const [years, cards] = await Promise.all([
      includeBacklog
        ? this.prisma.initiativeYear.findMany({
            where: {
              year: { gte: filter.years.from, lte: filter.years.to },
              initiative: { kind: { in: filter.kinds } },
            },
            select: { year: true, initiative: { select: { kind: true } } },
          })
        : [],
      quarters.length
        ? this.prisma.quarterCard.findMany({
            where: {
              quarter: { in: quarters },
              initiativeYear: {
                year: { gte: filter.years.from, lte: filter.years.to },
                initiative: { kind: { in: filter.kinds } },
              },
            },
            select: {
              quarter: true,
              initiativeYear: {
                select: { year: true, initiative: { select: { kind: true } } },
              },
            },
          })
        : [],
    ]);
    return this.previewFromRows(years, cards);
  }

  async load(filter: InitiativeExportFilterDto): Promise<InitiativeExportDataset> {
    this.validateFilter(filter);
    const quarters = quarterNumbers(filter.periods);
    const dataset = await this.prisma.$transaction(
      async (tx) => {
        const years = await tx.initiativeYear.findMany({
          where: {
            year: { gte: filter.years.from, lte: filter.years.to },
            initiative: { kind: { in: filter.kinds } },
          },
          include: YEAR_INCLUDE,
          orderBy: [{ year: "asc" }, { initiative: { name: "asc" } }],
        });
        const cards = quarters.length
          ? await tx.quarterCard.findMany({
              where: {
                quarter: { in: quarters },
                initiativeYear: {
                  year: { gte: filter.years.from, lte: filter.years.to },
                  initiative: { kind: { in: filter.kinds } },
                },
              },
              include: CARD_INCLUDE,
              orderBy: [
                { initiativeYear: { year: "asc" } },
                { quarter: "asc" },
                { initiativeYear: { initiative: { name: "asc" } } },
              ],
            })
          : [];
        const customFields = await tx.customFieldDefinition.findMany({
          where: { entityType: { in: entityTypes(filter.kinds) } },
          include: { options: { orderBy: { sortOrder: "asc" } } },
          orderBy: [{ entityType: "asc" }, { name: "asc" }],
        });
        const departments = await tx.department.findMany({
          select: { id: true, name: true, capacityLimitPoints: true },
          orderBy: { name: "asc" },
        });
        return { years, cards, customFields, departments };
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.RepeatableRead, timeout: 60_000 },
    );
    this.assertCardLimit(dataset.cards.length);
    return dataset;
  }

  private assertCardLimit(count: number) {
    const limit = this.config.get<number>("EXPORT_MAX_EXCEL_CARDS", 20_000);
    if (count > limit) {
      throw new AppError(
        "EXPORT_TOO_LARGE",
        `Експорт містить ${count} карток. Максимально дозволено ${limit}. Зменште період експорту.`,
        HttpStatus.PAYLOAD_TOO_LARGE,
        { count, limit },
      );
    }
  }

  private previewFromRows(
    years: Array<{ year: number; initiative: { kind: string } }>,
    cards: Array<{
      quarter: number;
      initiativeYear: { year: number; initiative: { kind: string } };
    }>,
  ) {
    const byYear: Record<string, number> = {};
    const byPeriod: Record<string, number> = {};
    const byKind: Record<string, number> = {};
    const matrix = new Map<string, { year: number; period: string; kind: string; count: number }>();
    const add = (year: number, period: string, kind: string) => {
      byYear[year] = (byYear[year] ?? 0) + 1;
      byPeriod[period] = (byPeriod[period] ?? 0) + 1;
      byKind[kind] = (byKind[kind] ?? 0) + 1;
      const key = `${year}:${period}:${kind}`;
      const cell = matrix.get(key) ?? { year, period, kind, count: 0 };
      cell.count += 1;
      matrix.set(key, cell);
    };
    years.forEach((row) => add(row.year, "BACKLOG", row.initiative.kind));
    cards.forEach((row) =>
      add(row.initiativeYear.year, `Q${row.quarter}`, row.initiativeYear.initiative.kind),
    );
    return {
      total: years.length + cards.length,
      backlog_records: years.length,
      quarter_cards: cards.length,
      by_year: byYear,
      by_period: byPeriod,
      by_kind: byKind,
      matrix: [...matrix.values()].sort(
        (a, b) => a.year - b.year || a.period.localeCompare(b.period) || a.kind.localeCompare(b.kind),
      ),
    };
  }
}
