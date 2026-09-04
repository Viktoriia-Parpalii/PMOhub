import { HttpStatus, Injectable } from "@nestjs/common";
import sanitizeHtml from "sanitize-html";
import { AuthUser } from "../../common/auth/auth-user";
import { AppError } from "../../common/errors/app-error";
import { Prisma } from "../../generated/prisma/client";
import { AiJsonExportDto, InitiativeExportFilterDto } from "./export.dto";
import { DatabaseSnapshotData } from "./database-snapshot-query.service";
import { ExportSummaryService } from "./export-summary.service";
import { ExportCard, InitiativeExportDataset } from "./initiative-export-query.service";

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

  ai(dataset: InitiativeExportDataset, request: AiJsonExportDto, actor: AuthUser) {
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
    const records: Array<Record<string, unknown>> = [];
    if (request.periods.includes("BACKLOG")) {
      dataset.years.forEach((year) => {
        const preparation = year.preparationStage;
        records.push({
          record_type: "BACKLOG",
          record_ref: year.id,
          kind: year.initiative.kind,
          year: year.year,
          ...(request.privacy.include_name ? { name: year.initiative.name } : {}),
          ...(request.privacy.include_strategic_goal ? { strategic_goal: year.strategicGoal } : {}),
          ...(request.privacy.include_manager ? { manager: preparation?.manager?.name ?? null } : {}),
          priority: preparation?.priority?.name ?? null,
          ...(request.privacy.include_departments
            ? { departments: preparation?.departments.map((link) => link.department.name) ?? [] }
            : {}),
          quarter_markers: year.quarterCards.map((card) => ({
            quarter: `Q${card.quarter}`,
            status: card.status.name,
            status_code: card.status.code,
          })),
        });
      });
    }
    dataset.cards.forEach((card) => {
      const scopeStatuses: Record<string, number> = { DEFAULT: 0, GREEN: 0, YELLOW: 0, RED: 0 };
      card.scopeItems.forEach((item) => {
        scopeStatuses[item.statusCode] = (scopeStatuses[item.statusCode] ?? 0) + 1;
      });
      const customFields = [...selected].map((id) => {
        const definition = available.get(id)!;
        const rawValue = fieldDisplayValue(card, id);
        return {
          id,
          name: definition.name,
          field_type: definition.fieldType,
          value:
            definition.fieldType === "RICHTEXT" && typeof rawValue === "string"
              ? sanitizeHtml(rawValue, { allowedTags: [], allowedAttributes: {} }).trim()
              : rawValue,
        };
      });
      const executors = new Set(card.scopeItems.flatMap((item) => item.executors.map((link) => link.departmentId)));
      records.push({
        record_type: "QUARTER_CARD",
        record_ref: card.id,
        kind: card.initiativeYear.initiative.kind,
        year: card.initiativeYear.year,
        quarter: `Q${card.quarter}`,
        ...(request.privacy.include_name ? { name: card.initiativeYear.initiative.name } : {}),
        ...(request.privacy.include_strategic_goal ? { strategic_goal: card.initiativeYear.strategicGoal } : {}),
        ...(request.privacy.include_manager ? { manager: card.manager?.name ?? null } : {}),
        priority: card.priority?.name ?? null,
        ...(request.privacy.include_departments
          ? {
              departments: card.departments
                .filter((link) => !executors.has(link.departmentId))
                .map((link) => link.department.name),
            }
          : {}),
        status: { code: card.status.code, name: card.status.name },
        size: card.sizeSnapshotName ?? "Не визначено",
        total_weight: card.totalWeight.toString(),
        progress: this.summaries.cardProgress(card),
        scope: { total: card.scopeItems.length, by_status: scopeStatuses },
        ...(request.privacy.include_notes
          ? { notes: sanitizeHtml(card.notes ?? "", { allowedTags: [], allowedAttributes: {} }).trim() || null }
          : {}),
        ...(customFields.length ? { custom_fields: customFields } : {}),
      });
    });
    const summary = this.summaries.build(dataset, request);
    if (!request.privacy.include_manager) delete (summary as Partial<typeof summary>).top_managers;
    if (!request.privacy.include_departments)
      delete (summary as Partial<typeof summary>).department_load;
    return jsonSafe({
      meta: {
        format: "PMOHUB_AI_EXPORT",
        format_version: "1.0",
        generated_at: new Date(),
        generated_by: { id: actor.id, name: actor.name },
        filters: {
          years: request.years,
          periods: request.periods,
          kinds: request.kinds,
        },
        privacy: request.privacy,
        scope_text_included: false,
      },
      summary,
      records,
    });
  }
}
