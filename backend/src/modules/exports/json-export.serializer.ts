import { HttpStatus, Injectable } from "@nestjs/common";
import sanitizeHtml from "sanitize-html";
import { AuthUser } from "../../common/auth/auth-user";
import { AppError } from "../../common/errors/app-error";
import { Prisma } from "../../generated/prisma/client";
import { AiJsonExportDto, InitiativeExportFilterDto } from "./export.dto";
import { DatabaseSnapshotData } from "./database-snapshot-query.service";
import { ExportSummaryService } from "./export-summary.service";
import { ExportCard, InitiativeExportDataset } from "./initiative-export-query.service";
import {
  AiBreakdownItem,
  AiManagementInitiative,
  AiManagementReportV2,
  AiScopeSummary,
} from "./ai-management-report";

const snakeCase = (value: string) =>
  value.replace(/([a-z0-9])([A-Z])/g, "$1_$2").toLowerCase();

const jsonSafe = (value: unknown, snakeKeys = false): unknown => {
  if (value instanceof Date) return value.toISOString();
  if (value instanceof Prisma.Decimal) return value.toString();
  if (Array.isArray(value)) return value.map((item) => jsonSafe(item, snakeKeys));
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value).map(([key, item]) => [
        snakeKeys ? snakeCase(key) : key,
        jsonSafe(item, snakeKeys),
      ]),
    );
  }
  return value;
};

const fieldDisplayValue = (card: ExportCard, definitionId: string) => {
  const value = card.customFieldValues.find((item) => item.definitionId === definitionId);
  if (!value) return null;
  if (value.booleanValue != null) return value.booleanValue;
  if (value.numberValue != null) return value.numberValue.toString();
  if (value.dateValue) return value.dateValue.toISOString().slice(0, 10);
  return value.textValue ?? value.optionValue ?? null;
};

const round = (value: number) => Math.round((value + Number.EPSILON) * 100) / 100;
const percent = (value: number, total: number) => (total ? round((value / total) * 100) : 0);

const scopeSummary = (card: ExportCard): AiScopeSummary => {
  const counts = { GREEN: 0, YELLOW: 0, RED: 0, DEFAULT: 0 };
  card.scopeItems.forEach((item) => {
    const code = item.statusCode in counts ? item.statusCode : "DEFAULT";
    counts[code as keyof typeof counts] += 1;
  });
  const total = card.scopeItems.length;
  return {
    total,
    completed: counts.GREEN,
    in_progress: counts.YELLOW,
    blocked: counts.RED,
    without_status: counts.DEFAULT,
    completion_rate_pct: percent(counts.GREEN + counts.YELLOW * 0.5, total),
    total_weight: round(
      card.scopeItems.reduce((sum, item) => sum + item.weightSnapshotValue.toNumber(), 0),
    ),
  };
};

const breakdown = (values: Array<string | null | undefined>, emptyLabel: string): AiBreakdownItem[] => {
  const counts = new Map<string, number>();
  values.forEach((value) => {
    const name = value?.trim() || emptyLabel;
    counts.set(name, (counts.get(name) ?? 0) + 1);
  });
  return [...counts]
    .map(([name, count]) => ({ name, count, share_pct: percent(count, values.length) }))
    .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name, "uk"));
};

@Injectable()
export class JsonExportSerializer {
  constructor(private readonly summaries: ExportSummaryService) {}

  full(data: DatabaseSnapshotData, actor: AuthUser) {
    const rowsByTable = Object.fromEntries(Object.entries(data).map(([key, rows]) => [key, rows.length]));
    const initiativeById = new Map(data.initiatives.map((item) => [item.id, item]));
    const yearById = new Map(data.initiative_years.map((item) => [item.id, item]));
    const byYear: Record<string, number> = {};
    const byQuarter: Record<string, number> = {};
    const byKind: Record<string, number> = {};
    const byYearQuarterKind: Record<string, number> = {};
    data.initiative_years.forEach((year) => {
      byYear[year.year] = (byYear[year.year] ?? 0) + 1;
      const kind = initiativeById.get(year.initiativeId)?.kind ?? "UNKNOWN";
      byKind[kind] = (byKind[kind] ?? 0) + 1;
    });
    data.quarter_cards.forEach((card) => {
      const year = yearById.get(card.initiativeYearId);
      if (!year) return;
      const kind = initiativeById.get(year.initiativeId)?.kind ?? "UNKNOWN";
      const quarter = `Q${card.quarter}`;
      byQuarter[quarter] = (byQuarter[quarter] ?? 0) + 1;
      const key = `${year.year}:${quarter}:${kind}`;
      byYearQuarterKind[key] = (byYearQuarterKind[key] ?? 0) + 1;
    });
    return jsonSafe({
      meta: {
        format: "PMOHUB_DATABASE_SNAPSHOT",
        format_version: "1.0",
        generated_at: new Date(),
        generated_by: { id: actor.id, name: actor.name, email: actor.email },
        redactions: ["users.password_hash", "refresh_tokens"],
      },
      summary: {
        total_rows: Object.values(rowsByTable).reduce((sum, count) => sum + count, 0),
        rows_by_table: rowsByTable,
        initiatives: {
          by_year: byYear,
          by_quarter: byQuarter,
          by_kind: byKind,
          by_year_quarter_kind: byYearQuarterKind,
        },
      },
      data,
    }, true);
  }

  ai(dataset: InitiativeExportDataset, request: AiJsonExportDto): AiManagementReportV2 {
    const selected = new Set(request.privacy.selected_custom_field_ids);
    const available = new Map(dataset.customFields.map((field) => [field.id, field]));
    const invalid = [...selected].filter((id) => !available.has(id));
    if (invalid.length) {
      throw new AppError(
        "INVALID_CUSTOM_FIELDS",
        "Деякі додаткові поля не існують або не належать вибраним типам ініціатив",
        HttpStatus.BAD_REQUEST,
        { field_ids: invalid },
      );
    }
    const records: AiManagementInitiative[] = [];
    const emptyScope: AiScopeSummary = {
      total: 0,
      completed: 0,
      in_progress: 0,
      blocked: 0,
      without_status: 0,
      completion_rate_pct: 0,
      total_weight: 0,
    };
    if (request.periods.includes("BACKLOG")) {
      dataset.years.forEach((year) => {
        const preparation = year.preparationStage;
        records.push({
          record_type: "BACKLOG",
          initiative_type: year.initiative.kind as AiManagementInitiative["initiative_type"],
          name: year.initiative.name,
          year: year.year,
          quarter: null,
          status: null,
          priority: preparation?.priority?.name ?? null,
          size: null,
          total_weight: 0,
          progress_pct: 0,
          scope: emptyScope,
          ...(request.privacy.include_manager ? { manager: preparation?.manager?.name ?? null } : {}),
          ...(request.privacy.include_departments
            ? { departments: preparation?.departments.map((link) => link.department.name) ?? [] }
            : {}),
        });
      });
    }
    dataset.cards.forEach((card) => {
      const customFields = [...selected].map((id) => {
        const definition = available.get(id)!;
        const rawValue = fieldDisplayValue(card, id);
        return {
          name: definition.name,
          field_type: definition.fieldType,
          value:
            definition.fieldType === "RICHTEXT" && typeof rawValue === "string"
              ? sanitizeHtml(rawValue, { allowedTags: [], allowedAttributes: {} }).trim()
              : rawValue,
        };
      });
      const departments = new Set([
        ...card.departments.map((link) => link.department.name),
        ...card.scopeItems.flatMap((item) => item.executors.map((link) => link.department.name)),
      ]);
      const scope = scopeSummary(card);
      records.push({
        record_type: "QUARTER_CARD",
        initiative_type: card.initiativeYear.initiative.kind as AiManagementInitiative["initiative_type"],
        name: card.initiativeYear.initiative.name,
        year: card.initiativeYear.year,
        quarter: `Q${card.quarter}`,
        status: card.status.name,
        priority: card.priority?.name ?? null,
        size: card.sizeSnapshotName ?? null,
        total_weight: round(card.totalWeight.toNumber()),
        progress_pct: this.summaries.cardProgress(card),
        scope,
        ...(request.privacy.include_manager ? { manager: card.manager?.name ?? null } : {}),
        ...(request.privacy.include_departments ? { departments: [...departments].sort() } : {}),
        ...(request.privacy.include_notes
          ? { notes: sanitizeHtml(card.notes ?? "", { allowedTags: [], allowedAttributes: {} }).trim() || null }
          : {}),
        ...(customFields.length ? { custom_fields: customFields } : {}),
      });
    });
    const capacity = this.summaries.managementCapacity(dataset, request);
    const allScope = dataset.cards.map(scopeSummary);
    const scopeTotal = allScope.reduce((sum, item) => sum + item.total, 0);
    const scopeProgressUnits = allScope.reduce(
      (sum, item) => sum + item.completed + item.in_progress * 0.5,
      0,
    );
    const years = Array.from(
      { length: request.years.to - request.years.from + 1 },
      (_, index) => request.years.from + index,
    );
    const quarters = request.periods.filter((period) => period !== "BACKLOG");
    const initiativeIds = new Set<string>();
    if (request.periods.includes("BACKLOG")) {
      dataset.years.forEach((year) => initiativeIds.add(year.initiative.id));
    }
    dataset.cards.forEach((card) => initiativeIds.add(card.initiativeYear.initiative.id));
    const quarterlyTrend = capacity.periods.map((period) => {
      const cards = dataset.cards.filter(
        (card) =>
          card.initiativeYear.year === period.year && `Q${card.quarter}` === period.quarter,
      );
      const scopes = cards.map(scopeSummary);
      const items = scopes.reduce((sum, item) => sum + item.total, 0);
      const progressUnits = scopes.reduce(
        (sum, item) => sum + item.completed + item.in_progress * 0.5,
        0,
      );
      return {
        year: period.year,
        quarter: period.quarter,
        initiatives_total: new Set(cards.map((card) => card.initiativeYear.initiative.id)).size,
        completion_rate_pct: cards.length
          ? round(cards.reduce((sum, card) => sum + this.summaries.cardProgress(card), 0) / cards.length)
          : 0,
        scope_items_total: items,
        scope_completion_rate_pct: percent(progressUnits, items),
        total_weight: round(cards.reduce((sum, card) => sum + card.totalWeight.toNumber(), 0)),
        capacity_limit: period.limit,
        capacity_load: period.load,
        capacity_reserve: period.reserve,
        overloaded_departments: period.overloaded_departments,
      };
    });
    const kindLabels = { PROJECT: "Проєкти", OPERATIONAL_TASK: "Операційні задачі" };
    const periodLabels = request.periods.map((period) => (period === "BACKLOG" ? "Беклог" : period));
    return {
      schema_version: "2.0",
      report_context: {
        data_as_of: new Date().toISOString(),
        period: { years, quarters },
        initiative_types: request.kinds,
        coverage: [
          `Роки: ${years.join(", ")}`,
          `Періоди: ${periodLabels.join(", ")}`,
          `Типи: ${request.kinds.map((kind) => kindLabels[kind]).join(", ")}`,
          "Менеджери: усі",
          "Пріоритети: усі",
        ],
        scope_confidentiality: "AGGREGATED_ONLY",
      },
      executive_metrics: {
        initiatives_total: initiativeIds.size,
        completion_rate_pct: dataset.cards.length
          ? round(dataset.cards.reduce((sum, card) => sum + this.summaries.cardProgress(card), 0) / dataset.cards.length)
          : 0,
        scope_items_total: scopeTotal,
        scope_completion_rate_pct: percent(scopeProgressUnits, scopeTotal),
        total_weight: round(dataset.cards.reduce((sum, card) => sum + card.totalWeight.toNumber(), 0)),
        capacity_limit: capacity.limit,
        capacity_load: capacity.load,
        capacity_reserve: capacity.reserve,
        overloaded_departments: capacity.overloaded_departments,
      },
      breakdowns: {
        by_status: breakdown(dataset.cards.map((card) => card.status?.name), "Без статусу"),
        by_priority: breakdown(dataset.cards.map((card) => card.priority?.name), "Без пріоритету"),
        by_size: breakdown(dataset.cards.map((card) => card.sizeSnapshotName), "Без розміру"),
        quarterly_trend: quarterlyTrend,
        department_capacity: request.privacy.include_departments ? capacity.departments : [],
      },
      initiatives: records,
      data_quality: {
        without_status: dataset.cards.filter((card) => !card.status?.name).length,
        without_priority: dataset.cards.filter((card) => !card.priority?.name).length,
        without_manager: dataset.cards.filter((card) => !card.manager?.name).length,
        without_size: dataset.cards.filter((card) => !card.sizeSnapshotName).length,
      },
      analysis_brief: {
        language: "uk-UA",
        audience: "EXECUTIVE_MANAGEMENT",
        sections: [
          "EXECUTIVE_SUMMARY",
          "KEY_RESULTS",
          "RISKS_AND_BLOCKERS",
          "CAPACITY_AND_RESERVE",
          "RECOMMENDED_DECISIONS",
        ],
        instruction: "Сформуй стислий звіт українською для керівництва: виділи результати, ризики, блокери, перевантаження та рекомендовані рішення. Не вигадуй відсутні дані й не відновлюй тексти скоупу з агрегатів.",
      },
    };
  }
}
