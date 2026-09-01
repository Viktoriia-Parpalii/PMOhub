import { Injectable } from "@nestjs/common";
import { ExportCard, InitiativeExportDataset } from "./initiative-export-query.service";
import { InitiativeExportFilterDto } from "./export.dto";

const round = (value: number) => Math.round((value + Number.EPSILON) * 100) / 100;
const progress = (card: ExportCard) => {
  if (!card.scopeItems.length) return 0;
  const total = card.scopeItems.reduce(
    (sum, item) => sum + (item.statusCode === "GREEN" ? 1 : item.statusCode === "YELLOW" ? 0.5 : 0),
    0,
  );
  return round((total / card.scopeItems.length) * 100);
};

@Injectable()
export class ExportSummaryService {
  cardProgress(card: ExportCard) {
    return progress(card);
  }

  build(dataset: InitiativeExportDataset, filter: InitiativeExportFilterDto) {
    const includeBacklog = filter.periods.includes("BACKLOG");
    const years = includeBacklog ? dataset.years : [];
    const byYear: Record<string, number> = {};
    const byQuarter: Record<string, number> = {};
    const byKind: Record<string, number> = {};
    const byStatus: Record<string, number> = {};
    const byScopeStatus: Record<string, number> = {};
    const bySize: Record<string, number> = {};
    const byYearQuarterKind: Record<string, number> = {};
    const managers = new Map<string, { name: string; cards: number; weight: number }>();

    const addKind = (kind: string) => (byKind[kind] = (byKind[kind] ?? 0) + 1);
    years.forEach((year) => {
      byYear[year.year] = (byYear[year.year] ?? 0) + 1;
      addKind(year.initiative.kind);
      const key = `${year.year}:BACKLOG:${year.initiative.kind}`;
      byYearQuarterKind[key] = (byYearQuarterKind[key] ?? 0) + 1;
    });
    dataset.cards.forEach((card) => {
      const year = card.initiativeYear.year;
      const quarter = `Q${card.quarter}`;
      const kind = card.initiativeYear.initiative.kind;
      byYear[year] = (byYear[year] ?? 0) + 1;
      byQuarter[quarter] = (byQuarter[quarter] ?? 0) + 1;
      addKind(kind);
      byStatus[card.status.name] = (byStatus[card.status.name] ?? 0) + 1;
      const size = card.sizeSnapshotName || "Не визначено";
      bySize[size] = (bySize[size] ?? 0) + 1;
      byYearQuarterKind[`${year}:${quarter}:${kind}`] =
        (byYearQuarterKind[`${year}:${quarter}:${kind}`] ?? 0) + 1;
      card.scopeItems.forEach((item) => {
        byScopeStatus[item.statusCode] = (byScopeStatus[item.statusCode] ?? 0) + 1;
      });
      if (card.manager) {
        const item = managers.get(card.manager.id) ?? { name: card.manager.name, cards: 0, weight: 0 };
        item.cards += 1;
        item.weight += card.totalWeight.toNumber();
        managers.set(card.manager.id, item);
      }
    });

    const departmentLoad = this.departmentLoads(dataset.cards);
    const departments = dataset.departments
      .map((department) => ({
        department_id: department.id,
        name: department.name,
        load: round(departmentLoad.get(department.id) ?? 0),
        limit: department.capacityLimitPoints.toNumber(),
      }))
      .filter((item) => item.load > 0)
      .sort((a, b) => b.load - a.load);

    return {
      total: years.length + dataset.cards.length,
      backlog_records: years.length,
      quarter_cards: dataset.cards.length,
      by_year: byYear,
      by_quarter: byQuarter,
      by_kind: byKind,
      by_year_quarter_kind: byYearQuarterKind,
      by_status: byStatus,
      by_scope_status: byScopeStatus,
      by_size: bySize,
      total_weight: round(dataset.cards.reduce((sum, card) => sum + card.totalWeight.toNumber(), 0)),
      average_progress: dataset.cards.length
        ? round(dataset.cards.reduce((sum, card) => sum + progress(card), 0) / dataset.cards.length)
        : 0,
      top_managers: [...managers.values()]
        .map((item) => ({ ...item, weight: round(item.weight) }))
        .sort((a, b) => b.weight - a.weight)
        .slice(0, 10),
      department_load: departments,
    };
  }

  private departmentLoads(cards: ExportCard[]) {
    const loads = new Map<string, number>();
    for (const card of cards) {
      const allExecutors = new Set(
        card.scopeItems.flatMap((item) => item.executors.map((link) => link.departmentId)),
      );
      for (const item of card.scopeItems) {
        const executors = [...new Set(item.executors.map((link) => link.departmentId))];
        const share = executors.length ? item.weightSnapshotValue.toNumber() / executors.length : 0;
        executors.forEach((id) => loads.set(id, (loads.get(id) ?? 0) + share));
      }
      const involved = card.departments
        .map((link) => link.departmentId)
        .filter((id) => !allExecutors.has(id));
      if (card.scopeItems.length && involved.length) {
        const total = card.scopeItems.reduce(
          (sum, item) => sum + item.weightSnapshotValue.toNumber(),
          0,
        );
        const share = total / card.scopeItems.length / involved.length;
        involved.forEach((id) => loads.set(id, (loads.get(id) ?? 0) + share));
      }
    }
    return loads;
  }
}
