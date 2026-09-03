import { Injectable } from "@nestjs/common";
import { Prisma } from "../../generated/prisma/client";
import { PrismaService } from "../../infrastructure/database/prisma.service";
import {
  AnalyticsDrilldownDto,
  AnalyticsFilterDto,
  QuarterlyAnalyticsFilterDto,
} from "./analytics.dto";

const round = (value: number) =>
  Math.round((value + Number.EPSILON) * 100) / 100;
const SCOPE_STATUSES = ["GREEN", "YELLOW", "RED", "DEFAULT"] as const;
const RISK_TYPES = [
  "NO_MANAGER",
  "NO_PRIORITY",
  "NO_SCOPE",
  "NO_EXECUTOR",
] as const;
type ScopeStatus = (typeof SCOPE_STATUSES)[number];
type RiskType = (typeof RISK_TYPES)[number];

const overviewSelect = {
  id: true,
  quarter: true,
  statusId: true,
  priorityId: true,
  totalWeight: true,
  sizeSnapshotName: true,
  initiativeYear: {
    select: {
      initiativeId: true,
    },
  },
  priority: { select: { name: true } },
  status: { select: { name: true, color: true } },
  scopeItems: { select: { statusCode: true } },
} satisfies Prisma.QuarterCardSelect;

const workloadSelect = {
  id: true,
  quarter: true,
  managerId: true,
  totalWeight: true,
  manager: { select: { name: true } },
  departments: { select: { departmentId: true } },
  scopeItems: {
    select: {
      weightSnapshotValue: true,
      executors: { select: { departmentId: true } },
    },
  },
} satisfies Prisma.QuarterCardSelect;

const recordSelect = {
  id: true,
  quarter: true,
  managerId: true,
  priorityId: true,
  statusId: true,
  totalWeight: true,
  sizeSnapshotName: true,
  initiativeYear: {
    select: {
      year: true,
      initiativeId: true,
      initiative: { select: { kind: true, name: true } },
    },
  },
  manager: { select: { name: true } },
  priority: { select: { name: true } },
  status: { select: { name: true, color: true } },
  departments: { select: { departmentId: true } },
  scopeItems: {
    select: {
      statusCode: true,
      executors: { select: { departmentId: true } },
    },
  },
} satisfies Prisma.QuarterCardSelect;

type OverviewCard = Prisma.QuarterCardGetPayload<{ select: typeof overviewSelect }>;
type WorkloadCard = Prisma.QuarterCardGetPayload<{ select: typeof workloadSelect }>;
type RecordCard = Prisma.QuarterCardGetPayload<{ select: typeof recordSelect }>;

@Injectable()
export class AnalyticsService {
  constructor(private readonly prisma: PrismaService) {}

  quarterlyOverview(filter: QuarterlyAnalyticsFilterDto) {
    return this.overview(filter, false);
  }

  annualOverview(filter: AnalyticsFilterDto) {
    return this.overview(filter, true);
  }

  quarterlyWorkload(filter: QuarterlyAnalyticsFilterDto) {
    return this.workload(filter, false);
  }

  annualWorkload(filter: AnalyticsFilterDto) {
    return this.workload(filter, true);
  }

  async quarterlyTrends(filter: QuarterlyAnalyticsFilterDto) {
    const quarter = this.quarterNumber(filter.quarter);
    const previousQuarter = quarter === 1 ? 4 : quarter - 1;
    const previousYear = quarter === 1 ? filter.year - 1 : filter.year;
    const [current, previous] = await Promise.all([
      this.prisma.quarterCard.count({ where: this.cardWhere(filter, quarter) }),
      this.prisma.quarterCard.count({
        where: this.cardWhere({ ...filter, year: previousYear }, previousQuarter),
      }),
    ]);
    return {
      generated_at: new Date().toISOString(),
      period_comparison: [
        { label: `Q${previousQuarter} ${previousYear}`, cards: previous },
        { label: `${filter.quarter} ${filter.year}`, cards: current },
      ],
    };
  }

  async annualTrends(filter: AnalyticsFilterDto) {
    const trendSelect = {
      quarter: true,
      statusId: true,
      initiativeYear: { select: { year: true, initiativeId: true } },
      status: { select: { name: true, color: true } },
    } satisfies Prisma.QuarterCardSelect;
    const [current, previous, history] = await Promise.all([
      this.prisma.quarterCard.findMany({
        where: this.cardWhere(filter),
        select: trendSelect,
      }),
      this.prisma.quarterCard.findMany({
        where: this.cardWhere({ ...filter, year: filter.year - 1 }),
        select: { quarter: true },
      }),
      this.prisma.quarterCard.findMany({
        where: this.cardWhere(filter, undefined, { lte: filter.year }),
        select: trendSelect,
      }),
    ]);
    const byYear = new Map<number, typeof history>();
    history.forEach((card) => {
      const bucket = byYear.get(card.initiativeYear.year) ?? [];
      bucket.push(card);
      byYear.set(card.initiativeYear.year, bucket);
    });
    return {
      generated_at: new Date().toISOString(),
      volume_trend: [1, 2, 3, 4].map((quarter) => ({
        quarter: `Q${quarter}`,
        current: current.filter((card) => card.quarter === quarter).length,
        previous: previous.filter((card) => card.quarter === quarter).length,
      })),
      history: [...byYear.entries()]
        .sort(([a], [b]) => a - b)
        .map(([year, cards]) => ({
          year,
          cards: cards.length,
          initiatives: new Set(
            cards.map((card) => card.initiativeYear.initiativeId),
          ).size,
          status_distribution: this.statusDistribution(cards),
        })),
    };
  }

  async quarterlyPlanningHealth(filter: QuarterlyAnalyticsFilterDto) {
    const base = this.cardWhere(filter, this.quarterNumber(filter.quarter));
    const anyRisk: Prisma.QuarterCardWhereInput = {
      AND: [base, { OR: RISK_TYPES.map((risk) => this.riskWhere(risk)) }],
    };
    const [total, counts, cards] = await Promise.all([
      this.prisma.quarterCard.count({ where: anyRisk }),
      Promise.all(
        RISK_TYPES.map((risk) =>
          this.prisma.quarterCard.count({
            where: { AND: [base, this.riskWhere(risk)] },
          }),
        ),
      ),
      this.prisma.quarterCard.findMany({
        where: anyRisk,
        select: recordSelect,
        orderBy: { createdAt: "asc" },
        take: 10,
      }),
    ]);
    return {
      generated_at: new Date().toISOString(),
      risks: {
        total,
        by_type: RISK_TYPES.map((type, index) => ({
          type,
          count: counts[index],
        })).filter((item) => item.count > 0),
        preview: cards.map((card) => ({
          id: card.id,
          name: card.initiativeYear.initiative.name,
          risks: this.risks(card),
        })),
      },
    };
  }

  async annualPlanningHealth(filter: AnalyticsFilterDto) {
    const years = await this.prisma.initiativeYear.findMany({
      where: {
        year: filter.year,
        initiative: filter.kind ? { kind: filter.kind } : undefined,
        quarterCards: { none: {} },
        preparationStage:
          filter.manager_id || filter.department_id
            ? {
                managerId: filter.manager_id,
                departments: filter.department_id
                  ? { some: { departmentId: filter.department_id } }
                  : undefined,
              }
            : undefined,
      },
      select: {
        preparationStage: {
          select: {
            managerId: true,
            priorityId: true,
            departments: { select: { departmentId: true } },
          },
        },
      },
    });
    const ready = years.filter(
      (year) =>
        year.preparationStage?.managerId &&
        year.preparationStage.priorityId &&
        year.preparationStage.departments.length,
    ).length;
    return {
      generated_at: new Date().toISOString(),
      preparation: { total: years.length, ready, incomplete: years.length - ready },
    };
  }

  async drilldown(filter: AnalyticsDrilldownDto) {
    if (filter.view === "preparation") return this.preparationDrilldown(filter);
    const quarter =
      filter.mode === "quarterly" && filter.quarter
        ? this.quarterNumber(filter.quarter)
        : undefined;
    const where = this.drilldownWhere(filter, quarter);
    const skip = (filter.page - 1) * filter.page_size;
    const [total, cards] = await Promise.all([
      this.prisma.quarterCard.count({ where }),
      this.prisma.quarterCard.findMany({
        where,
        select: recordSelect,
        orderBy: [{ initiativeYear: { year: "asc" } }, { quarter: "asc" }, { createdAt: "asc" }],
        skip,
        take: filter.page_size,
      }),
    ]);
    return {
      records: cards.map((card) => this.record(card)),
      page: filter.page,
      page_size: filter.page_size,
      total,
    };
  }

  private async overview(filter: AnalyticsFilterDto, annual: boolean) {
    const quarter = this.filterQuarter(filter);
    const [cards, availableYears] = await Promise.all([
      this.prisma.quarterCard.findMany({
        where: this.cardWhere(filter, quarter),
        select: overviewSelect,
      }),
      this.availableYears(filter.kind),
    ]);
    const scopeItems = cards.flatMap((card) => card.scopeItems);
    const scopeStatusCounts = this.emptyCounts();
    scopeItems.forEach((item) => {
      scopeStatusCounts[this.status(item.statusCode)] += 1;
    });
    const cardProgress = cards.flatMap((card) =>
      card.scopeItems.length ? [this.progress(card)] : [],
    );
    const progress = annual
      ? scopeItems.length
        ? Math.round(
            (scopeItems.reduce(
              (sum, item) => sum + this.scopeProgressValue(item.statusCode),
              0,
            ) /
              scopeItems.length) *
              100,
          )
        : 0
      : cardProgress.length
        ? Math.round(
            cardProgress.reduce((sum, value) => sum + value, 0) /
              cardProgress.length,
          )
        : 0;
    const duration = new Map<string, number>();
    cards.forEach((card) =>
      duration.set(
        card.initiativeYear.initiativeId,
        (duration.get(card.initiativeYear.initiativeId) ?? 0) + 1,
      ),
    );
    const sizes = new Map<string, number>();
    const priorities = new Map<
      string,
      { priority_id: string | null; name: string; count: number; status_counts: Record<string, number> }
    >();
    cards.forEach((card) => {
      const size = card.sizeSnapshotName ?? "Не визначено";
      sizes.set(size, (sizes.get(size) ?? 0) + 1);
      const key = card.priorityId ?? "NONE";
      const priority = priorities.get(key) ?? {
        priority_id: card.priorityId,
        name: card.priority?.name ?? "Без пріоритету",
        count: 0,
        status_counts: {},
      };
      priority.count += 1;
      priority.status_counts[card.statusId] =
        (priority.status_counts[card.statusId] ?? 0) + 1;
      priorities.set(key, priority);
    });
    return {
      generated_at: new Date().toISOString(),
      mode: annual ? "ANNUAL" : "QUARTERLY",
      available_years: availableYears,
      summary: {
        cards: cards.length,
        initiatives: duration.size,
        total_weight: round(
          cards.reduce((sum, card) => sum + card.totalWeight.toNumber(), 0),
        ),
        average_progress: progress,
        average_duration:
          annual && duration.size
            ? round(
                [...duration.values()].reduce((sum, value) => sum + value, 0) /
                  duration.size,
              )
            : 0,
      },
      status_distribution: this.statusDistribution(cards),
      ...(annual ? {} : { scope_status_counts: scopeStatusCounts }),
      size_breakdown: [...sizes].map(([name, count]) => ({ name, count })),
      priority_status_breakdown: [...priorities.values()].sort(
        (a, b) => b.count - a.count,
      ),
    };
  }

  private async workload(filter: AnalyticsFilterDto, annual: boolean) {
    const quarter = this.filterQuarter(filter);
    const [cards, departments] = await Promise.all([
      this.prisma.quarterCard.findMany({
        where: this.cardWhere(filter, quarter),
        select: workloadSelect,
      }),
      this.prisma.department.findMany({
        where: filter.department_id ? { id: filter.department_id } : undefined,
        select: { id: true, name: true, capacityLimitPoints: true },
      }),
    ]);
    const loadsByQuarter = [1, 2, 3, 4].map((value) => ({
      quarter: `Q${value}`,
      loads: this.departmentLoads(cards.filter((card) => card.quarter === value)),
    }));
    const departmentRows = departments.map((department) => {
      const quarters = loadsByQuarter.map((period) => ({
        quarter: period.quarter,
        load: period.loads.get(department.id) ?? 0,
        limit: department.capacityLimitPoints.toNumber(),
      }));
      const load = annual
        ? round(quarters.reduce((sum, period) => sum + period.load, 0))
        : (quarters.find((period) => period.quarter === (filter as QuarterlyAnalyticsFilterDto).quarter)?.load ?? 0);
      const limit = department.capacityLimitPoints.toNumber() * (annual ? 4 : 1);
      return {
        id: department.id,
        name: department.name,
        load,
        limit,
        reserve: round(limit - load),
        is_over_capacity: load > limit,
        ...(annual ? { quarters } : {}),
      };
    });
    const managers = new Map<
      string,
      { manager_id: string; name: string; load: number; cards: number }
    >();
    cards.forEach((card) => {
      if (!card.managerId) return;
      const manager = managers.get(card.managerId) ?? {
        manager_id: card.managerId,
        name: card.manager?.name ?? "Невідомий менеджер",
        load: 0,
        cards: 0,
      };
      manager.load = round(manager.load + card.totalWeight.toNumber());
      manager.cards += 1;
      managers.set(card.managerId, manager);
    });
    return {
      generated_at: new Date().toISOString(),
      overloaded_departments: departmentRows.filter((item) => item.is_over_capacity).length,
      departments: departmentRows,
      managers: [...managers.values()].sort((a, b) => b.load - a.load),
    };
  }

  private async preparationDrilldown(filter: AnalyticsDrilldownDto) {
    const where: Prisma.InitiativeYearWhereInput = {
      year: filter.year,
      initiative: filter.kind ? { kind: filter.kind } : undefined,
      quarterCards: { none: {} },
      preparationStage:
        filter.manager_id || filter.department_id
          ? {
              managerId: filter.manager_id,
              departments: filter.department_id
                ? { some: { departmentId: filter.department_id } }
                : undefined,
            }
          : undefined,
    };
    const skip = (filter.page - 1) * filter.page_size;
    const [total, years] = await Promise.all([
      this.prisma.initiativeYear.count({ where }),
      this.prisma.initiativeYear.findMany({
        where,
        skip,
        take: filter.page_size,
        orderBy: { createdAt: "asc" },
        select: {
          id: true,
          year: true,
          initiativeId: true,
          initiative: { select: { kind: true, name: true } },
          preparationStage: {
            select: {
              managerId: true,
              priorityId: true,
              manager: { select: { name: true } },
              priority: { select: { name: true } },
              departments: { select: { departmentId: true } },
            },
          },
        },
      }),
    ]);
    return {
      records: years.map((year) => {
        const ready = Boolean(
          year.preparationStage?.managerId &&
            year.preparationStage.priorityId &&
            year.preparationStage.departments.length,
        );
        return {
          id: year.id,
          initiative_id: year.initiativeId,
          kind: year.initiative.kind,
          name: year.initiative.name,
          year: year.year,
          quarter: "Q1",
          manager_id: year.preparationStage?.managerId ?? null,
          manager_name: year.preparationStage?.manager?.name ?? null,
          priority_id: year.preparationStage?.priorityId ?? null,
          priority_name: year.preparationStage?.priority?.name ?? null,
          department_ids:
            year.preparationStage?.departments.map((item) => item.departmentId) ?? [],
          status_id: "PREPARATION",
          status_name: "Підготовчий етап",
          status_color: "#94a3b8",
          total_weight: 0,
          size_name: "Підготовчий етап",
          progress: ready ? 100 : 0,
          scope_items: 0,
          risks: ready ? [] : ["INCOMPLETE_PREPARATION"],
        };
      }),
      page: filter.page,
      page_size: filter.page_size,
      total,
    };
  }

  private cardWhere(
    filter: Partial<AnalyticsFilterDto>,
    quarter?: number,
    year: number | Prisma.IntFilter | undefined = filter.year,
  ): Prisma.QuarterCardWhereInput {
    return {
      quarter,
      managerId: filter.manager_id,
      departments: filter.department_id
        ? { some: { departmentId: filter.department_id } }
        : undefined,
      initiativeYear: {
        year,
        initiative: filter.kind ? { kind: filter.kind } : undefined,
      },
    };
  }

  private drilldownWhere(
    filter: AnalyticsDrilldownDto,
    quarter?: number,
  ): Prisma.QuarterCardWhereInput {
    const dimensions: Prisma.QuarterCardWhereInput = {
      ...this.cardWhere(filter, quarter),
      id: filter.card_id,
      statusId: filter.status_id,
      sizeSnapshotName:
        filter.size_name === "Не визначено" ? null : filter.size_name,
      priorityId:
        filter.priority_key === "NONE"
          ? null
          : filter.priority_key || undefined,
    };
    return filter.risk
      ? { AND: [dimensions, this.riskWhere(filter.risk)] }
      : dimensions;
  }

  private riskWhere(risk: RiskType): Prisma.QuarterCardWhereInput {
    if (risk === "NO_MANAGER") return { managerId: null };
    if (risk === "NO_PRIORITY") return { priorityId: null };
    if (risk === "NO_SCOPE") return { scopeItems: { none: {} } };
    return { scopeItems: { some: { executors: { none: {} } } } };
  }

  private filterQuarter(filter: AnalyticsFilterDto) {
    return "quarter" in filter && typeof filter.quarter === "string"
      ? this.quarterNumber(filter.quarter)
      : undefined;
  }

  private quarterNumber(quarter: string) {
    return Number(quarter.slice(1));
  }

  private async availableYears(kind?: AnalyticsFilterDto["kind"]) {
    const rows = await this.prisma.initiativeYear.findMany({
      where: { initiative: kind ? { kind } : undefined },
      distinct: ["year"],
      select: { year: true },
      orderBy: { year: "asc" },
    });
    return rows.map((row) => row.year);
  }

  private record(card: RecordCard) {
    return {
      id: card.id,
      initiative_id: card.initiativeYear.initiativeId,
      kind: card.initiativeYear.initiative.kind,
      name: card.initiativeYear.initiative.name,
      year: card.initiativeYear.year,
      quarter: `Q${card.quarter}`,
      manager_id: card.managerId,
      manager_name: card.manager?.name ?? null,
      priority_id: card.priorityId,
      priority_name: card.priority?.name ?? null,
      department_ids: card.departments.map((item) => item.departmentId),
      status_id: card.statusId,
      status_name: card.status.name,
      status_color: card.status.color,
      total_weight: card.totalWeight.toNumber(),
      size_name: card.sizeSnapshotName ?? "Не визначено",
      progress: this.progress(card),
      scope_items: card.scopeItems.length,
      risks: this.risks(card),
    };
  }

  private risks(card: Pick<RecordCard, "managerId" | "priorityId" | "scopeItems">) {
    const risks: RiskType[] = [];
    if (!card.managerId) risks.push("NO_MANAGER");
    if (!card.priorityId) risks.push("NO_PRIORITY");
    if (!card.scopeItems.length) risks.push("NO_SCOPE");
    if (card.scopeItems.some((item) => !item.executors.length))
      risks.push("NO_EXECUTOR");
    return risks;
  }

  private progress(card: { scopeItems: Array<{ statusCode: string }> }) {
    return card.scopeItems.length
      ? Math.round(
          (card.scopeItems.reduce(
            (sum, item) => sum + this.scopeProgressValue(item.statusCode),
            0,
          ) /
            card.scopeItems.length) *
            100,
        )
      : 0;
  }

  private scopeProgressValue(status: string) {
    return status === "GREEN" ? 1 : status === "YELLOW" ? 0.5 : 0;
  }

  private statusDistribution<
    T extends {
      statusId: string;
      status: { name: string; color: string };
    },
  >(cards: T[]) {
    const result = new Map<
      string,
      { status_id: string; name: string; color: string; count: number }
    >();
    cards.forEach((card) => {
      const current = result.get(card.statusId) ?? {
        status_id: card.statusId,
        name: card.status.name,
        color: card.status.color,
        count: 0,
      };
      current.count += 1;
      result.set(card.statusId, current);
    });
    return [...result.values()].sort(
      (a, b) => b.count - a.count || a.name.localeCompare(b.name, "uk"),
    );
  }

  private emptyCounts(): Record<ScopeStatus, number> {
    return { GREEN: 0, YELLOW: 0, RED: 0, DEFAULT: 0 };
  }

  private status(value: string): ScopeStatus {
    return SCOPE_STATUSES.includes(value as ScopeStatus)
      ? (value as ScopeStatus)
      : "DEFAULT";
  }

  private departmentLoads(cards: WorkloadCard[]) {
    const loads = new Map<string, number>();
    cards.forEach((card) => {
      const executors = new Set(
        card.scopeItems.flatMap((item) =>
          item.executors.map((link) => link.departmentId),
        ),
      );
      card.scopeItems.forEach((item) => {
        const ids = [...new Set(item.executors.map((link) => link.departmentId))];
        const share = ids.length ? item.weightSnapshotValue.toNumber() / ids.length : 0;
        ids.forEach((id) => loads.set(id, round((loads.get(id) ?? 0) + share)));
      });
      const involved = card.departments
        .map((link) => link.departmentId)
        .filter((id) => !executors.has(id));
      if (card.scopeItems.length && involved.length) {
        const share = card.totalWeight.toNumber() / card.scopeItems.length / involved.length;
        involved.forEach((id) =>
          loads.set(id, round((loads.get(id) ?? 0) + share)),
        );
      }
    });
    return loads;
  }
}
