import { Injectable } from "@nestjs/common";
import { PrismaService } from "../../infrastructure/database/prisma.service";
import {
  AnalyticsDrilldownDto,
  AnalyticsFilterDto,
  QuarterlyAnalyticsFilterDto,
} from "./analytics.dto";
import { Prisma } from "../../generated/prisma/client";

const round = (value: number) =>
  Math.round((value + Number.EPSILON) * 100) / 100;
const SCOPE_STATUSES = ["GREEN", "YELLOW", "RED", "DEFAULT"] as const;
type ScopeStatus = (typeof SCOPE_STATUSES)[number];
type Card = Prisma.QuarterCardGetPayload<{
  include: {
    initiativeYear: { include: { initiative: true } };
    manager: true;
    priority: true;
    status: true;
    departments: true;
    scopeItems: { include: { executors: true } };
  };
}>;

@Injectable()
export class AnalyticsService {
  constructor(private readonly prisma: PrismaService) {}

  async quarterly(filter: QuarterlyAnalyticsFilterDto) {
    const quarter = Number(filter.quarter.slice(1));
    const previousQuarter = quarter === 1 ? 4 : quarter - 1;
    const previousYear = quarter === 1 ? filter.year - 1 : filter.year;
    const cards = await this.cards({ ...filter, quarter });
    const previousCards = await this.cards({
      ...filter,
      year: previousYear,
      quarter: previousQuarter,
    });
    return {
      mode: "QUARTERLY",
      filters: filter,
      ...(await this.aggregate(cards, false, filter.department_id)),
      available_years: await this.availableYears(filter.kind),
      quarter_trend: [],
      volume_trend: [],
      period_comparison: [
        {
          label: `Q${previousQuarter} ${previousYear}`,
          cards: previousCards.length,
        },
        { label: `${filter.quarter} ${filter.year}`, cards: cards.length },
      ],
      history: [],
      preparation: { total: 0, ready: 0, records: [] },
    };
  }

  async annual(filter: AnalyticsFilterDto) {
    const cards = await this.cards(filter);
    const latestByInitiative = new Map<string, Card>();
    cards.forEach((card) => {
      const key = card.initiativeYear.initiativeId;
      if (
        !latestByInitiative.has(key) ||
        latestByInitiative.get(key)!.quarter < card.quarter
      )
        latestByInitiative.set(key, card);
    });
    const previousYearCards = await this.cards({
      ...filter,
      year: filter.year - 1,
    });
    const years = await this.filteredYears(filter);
    const preparationRecords = years
      .filter((year) => !year.quarterCards.length)
      .map((year) => ({
        id: year.id,
        initiative_id: year.initiativeId,
        kind: year.initiative.kind,
        name: year.initiative.name,
        year: year.year,
        manager_id: year.preparationStage?.managerId ?? null,
        priority_id: year.preparationStage?.priorityId ?? null,
        department_ids:
          year.preparationStage?.departments.map((link) => link.departmentId) ??
          [],
        ready: Boolean(
          year.preparationStage?.managerId &&
          year.preparationStage?.priorityId &&
          year.preparationStage.departments.length,
        ),
      }));
    const historyCards = await this.cards({ ...filter, year: undefined });
    const historyByYear = new Map<number, Card[]>();
    historyCards
      .filter((card) => card.initiativeYear.year <= filter.year)
      .forEach((card) => {
        const bucket = historyByYear.get(card.initiativeYear.year) ?? [];
        bucket.push(card);
        historyByYear.set(card.initiativeYear.year, bucket);
      });
    const history = [...historyByYear.entries()]
      .sort(([a], [b]) => a - b)
      .map(([year, yearCards]) => ({
        year,
        status_distribution: this.statusDistribution(yearCards),
        initiatives: new Set(
          yearCards.map((card) => card.initiativeYear.initiativeId),
        ).size,
        cards: yearCards.length,
      }));
    return {
      mode: "ANNUAL",
      filters: filter,
      ...(await this.aggregate(cards, true, filter.department_id, [
        ...latestByInitiative.values(),
      ])),
      available_years: await this.availableYears(filter.kind),
      quarter_trend: [1, 2, 3, 4].map((quarter) => {
        const period = cards.filter((card) => card.quarter === quarter);
        return {
          quarter: `Q${quarter}`,
          cards: period.length,
          initiatives: new Set(
            period.map((card) => card.initiativeYear.initiativeId),
          ).size,
          total_weight: round(
            period.reduce((sum, card) => sum + card.totalWeight.toNumber(), 0),
          ),
        };
      }),
      volume_trend: [1, 2, 3, 4].map((quarter) => ({
        quarter: `Q${quarter}`,
        current: cards.filter((card) => card.quarter === quarter).length,
        previous: previousYearCards.filter((card) => card.quarter === quarter)
          .length,
      })),
      period_comparison: [],
      history,
      preparation: {
        total: preparationRecords.length,
        ready: preparationRecords.filter((item) => item.ready).length,
        records: preparationRecords,
      },
    };
  }

  async drilldown(filter: AnalyticsDrilldownDto) {
    const quarter =
      filter.mode === "quarterly" && filter.quarter
        ? Number(filter.quarter.slice(1))
        : undefined;
    let cards = await this.cards({ ...filter, quarter });
    if (filter.card_ids) {
      const ids = new Set(filter.card_ids.split(",").filter(Boolean));
      cards = cards.filter((card) => ids.has(card.id));
    }
    if (filter.status_id)
      cards = cards.filter((card) => card.statusId === filter.status_id);
    const total = cards.length;
    const start = (filter.page - 1) * filter.page_size;
    return {
      records: cards
        .slice(start, start + filter.page_size)
        .map((card) => this.record(card)),
      page: filter.page,
      page_size: filter.page_size,
      total,
    };
  }

  private cards(filter: Partial<AnalyticsFilterDto> & { quarter?: number }) {
    return this.prisma.quarterCard.findMany({
      where: {
        quarter: filter.quarter,
        managerId: filter.manager_id,
        departments: filter.department_id
          ? { some: { departmentId: filter.department_id } }
          : undefined,
        initiativeYear: {
          year: filter.year,
          initiative: filter.kind ? { kind: filter.kind } : undefined,
        },
      },
      include: {
        initiativeYear: { include: { initiative: true } },
        manager: true,
        priority: true,
        status: true,
        departments: true,
        scopeItems: { include: { executors: true } },
      },
      orderBy: [
        { initiativeYear: { year: "asc" } },
        { quarter: "asc" },
        { createdAt: "asc" },
      ],
    });
  }

  private filteredYears(filter: AnalyticsFilterDto) {
    return this.prisma.initiativeYear.findMany({
      where: {
        year: filter.year,
        initiative: filter.kind ? { kind: filter.kind } : undefined,
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
      include: {
        initiative: true,
        preparationStage: { include: { departments: true } },
        quarterCards: { select: { id: true } },
      },
    });
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

  private async aggregate(
    cards: Card[],
    annual: boolean,
    departmentId?: string,
    riskCards: Card[] = cards,
  ) {
    const loadsByQuarter = [1, 2, 3, 4].map((quarter) => ({
      quarter: `Q${quarter}`,
      loads: this.departmentLoads(
        cards.filter((card) => card.quarter === quarter),
      ),
    }));
    const departments = await this.prisma.department.findMany({
      where: departmentId ? { id: departmentId } : undefined,
    });
    const capacity = departments.map((department) => {
      const quarterly = loadsByQuarter.map(
        (period) => period.loads.get(department.id) ?? 0,
      );
      const load = annual
        ? round(quarterly.reduce((sum, value) => sum + value, 0))
        : Math.max(...quarterly);
      const limit =
        department.capacityLimitPoints.toNumber() * (annual ? 4 : 1);
      return {
        department_id: department.id,
        name: department.name,
        load,
        limit,
        reserve: round(limit - load),
        is_over_capacity: load > limit,
      };
    });
    const managerMap = new Map<
      string,
      { manager_id: string; name: string; load: number; card_ids: string[] }
    >();
    cards.forEach((card) => {
      if (!card.managerId) return;
      const current = managerMap.get(card.managerId) ?? {
        manager_id: card.managerId,
        name: card.manager?.name ?? "Невідомий менеджер",
        load: 0,
        card_ids: [] as string[],
      };
      current.load = round(current.load + card.totalWeight.toNumber());
      current.card_ids.push(card.id);
      managerMap.set(card.managerId, current);
    });
    const scopeItems = cards.flatMap((card) => card.scopeItems);
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
      : (() => {
          const cardProgress = cards.flatMap((card) =>
            card.scopeItems.length ? [this.progress(card)] : [],
          );
          return cardProgress.length
            ? Math.round(
                cardProgress.reduce((sum, value) => sum + value, 0) /
                  cardProgress.length,
              )
            : 0;
        })();
    const scopeStatusCounts = this.emptyCounts();
    scopeItems.forEach((item) => {
      scopeStatusCounts[this.status(item.statusCode)] += 1;
    });
    const sizeMap = new Map<string, string[]>();
    cards.forEach((card) => {
      const name = card.sizeSnapshotName ?? "Не визначено";
      sizeMap.set(name, [...(sizeMap.get(name) ?? []), card.id]);
    });
    const priorityMap = new Map<
      string,
      {
        priority_id: string | null;
        name: string;
        total_weight: number;
        card_ids: string[];
      }
    >();
    cards.forEach((card) => {
      const key = card.priorityId ?? "NONE";
      const current = priorityMap.get(key) ?? {
        priority_id: card.priorityId,
        name: card.priority?.name ?? "Без пріоритету",
        total_weight: 0,
        card_ids: [] as string[],
      };
      current.total_weight = round(
        current.total_weight + card.totalWeight.toNumber(),
      );
      current.card_ids.push(card.id);
      priorityMap.set(key, current);
    });
    const priorityStatusMap = new Map<
      string,
      {
        priority_id: string | null;
        name: string;
        card_ids: string[];
        status_counts: Record<string, number>;
      }
    >();
    cards.forEach((card) => {
      const key = card.priorityId ?? "NONE";
      const current = priorityStatusMap.get(key) ?? {
        priority_id: card.priorityId,
        name: card.priority?.name ?? "Без пріоритету",
        card_ids: [] as string[],
        status_counts: {},
      };
      current.card_ids.push(card.id);
      current.status_counts[card.statusId] =
        (current.status_counts[card.statusId] ?? 0) + 1;
      priorityStatusMap.set(key, current);
    });
    const risks = riskCards
      .map((card) => this.record(card))
      .filter((record) => record.risks.length)
      .map((record) => ({
        id: record.id,
        name: record.name,
        risks: record.risks,
      }));
    const duration = new Map<string, number>();
    cards.forEach((card) =>
      duration.set(
        card.initiativeYear.initiativeId,
        (duration.get(card.initiativeYear.initiativeId) ?? 0) + 1,
      ),
    );
    return {
      summary: {
        cards: cards.length,
        initiatives: new Set(
          cards.map((card) => card.initiativeYear.initiativeId),
        ).size,
        total_weight: round(
          cards.reduce((sum, card) => sum + card.totalWeight.toNumber(), 0),
        ),
        average_progress: progress,
        average_duration: duration.size
          ? round(
              [...duration.values()].reduce((sum, value) => sum + value, 0) /
                duration.size,
            )
          : 0,
        overloaded_departments: capacity.filter((item) => item.is_over_capacity)
          .length,
      },
      status_distribution: this.statusDistribution(cards),
      scope_status_counts: scopeStatusCounts,
      size_breakdown: [...sizeMap].map(([name, card_ids]) => ({
        name,
        count: card_ids.length,
        card_ids,
      })),
      priority_breakdown: [...priorityMap.values()].sort(
        (a, b) => b.total_weight - a.total_weight,
      ),
      priority_status_breakdown: [...priorityStatusMap.values()].sort(
        (a, b) => b.card_ids.length - a.card_ids.length,
      ),
      department_capacity: capacity,
      capacity_by_quarter: loadsByQuarter.map((period) => ({
        quarter: period.quarter,
        departments: departments.map((department) => ({
          department_id: department.id,
          name: department.name,
          load: period.loads.get(department.id) ?? 0,
          limit: department.capacityLimitPoints.toNumber(),
        })),
      })),
      manager_loads: [...managerMap.values()].sort((a, b) => b.load - a.load),
      risks,
    };
  }

  private record(card: Card) {
    const risks: string[] = [];
    if (!card.managerId) risks.push("NO_MANAGER");
    if (!card.priorityId) risks.push("NO_PRIORITY");
    if (!card.scopeItems.length) risks.push("NO_SCOPE");
    if (card.scopeItems.some((item) => !item.executors.length))
      risks.push("NO_EXECUTOR");
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
      department_ids: card.departments.map((link) => link.departmentId),
      status_id: card.statusId,
      status_code: card.status.code,
      status_name: card.status.name,
      status_color: card.status.color,
      total_weight: card.totalWeight.toNumber(),
      size_name: card.sizeSnapshotName ?? "Не визначено",
      progress: this.progress(card),
      scope_items: card.scopeItems.length,
      risks,
    };
  }

  private progress(card: Card) {
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
  private statusDistribution(cards: Card[]) {
    const result = new Map<
      string,
      {
        status_id: string;
        code: string;
        name: string;
        color: string;
        count: number;
        card_ids: string[];
      }
    >();
    cards.forEach((card) => {
      const current = result.get(card.statusId) ?? {
        status_id: card.statusId,
        code: card.status.code,
        name: card.status.name,
        color: card.status.color,
        count: 0,
        card_ids: [],
      };
      current.count += 1;
      current.card_ids.push(card.id);
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

  private departmentLoads(cards: Card[]) {
    const loads = new Map<string, number>();
    cards.forEach((card) => {
      const executors = new Set<string>(
        card.scopeItems.flatMap((item) =>
          item.executors.map((link) => link.departmentId),
        ),
      );
      card.scopeItems.forEach((item) => {
        const ids = [
          ...new Set<string>(item.executors.map((link) => link.departmentId)),
        ];
        const share = ids.length
          ? item.weightSnapshotValue.toNumber() / ids.length
          : 0;
        ids.forEach((id) => loads.set(id, round((loads.get(id) ?? 0) + share)));
      });
      const involved: string[] = card.departments
        .map((link) => link.departmentId)
        .filter((id) => !executors.has(id));
      if (card.scopeItems.length && involved.length) {
        const share =
          card.totalWeight.toNumber() /
          card.scopeItems.length /
          involved.length;
        involved.forEach((id) =>
          loads.set(id, round((loads.get(id) ?? 0) + share)),
        );
      }
    });
    return loads;
  }
}
