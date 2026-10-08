import type { components } from "../../../../api/generated/schema";

export type InitiativeExportFilter = components["schemas"]["InitiativeExportFilterDto"];
export type AiExportPrivacy = components["schemas"]["AiExportPrivacyDto"];
export type ExcelExportRequest = components["schemas"]["ExcelExportDto"];
export type ExcelExportOptions = components["schemas"]["ExcelExportOptionsDto"];
export type ExcelField = ExcelExportOptions["selected_fields"][number];
export type ExportCustomField = components["schemas"]["ExportCustomFieldDto"];
export type ExportKind = InitiativeExportFilter["kinds"][number];
export type ExportPeriod = InitiativeExportFilter["periods"][number];

export interface ExportAvailability {
  years: number[];
  counts: Record<string, { backlog: number; quarter_cards: number }>;
  custom_fields: ExportCustomField[];
}

export interface ExportPreview {
  total: number;
  backlog_records: number;
  quarter_cards: number;
  by_year: Record<string, number>;
  by_period: Record<string, number>;
  by_kind: Record<string, number>;
  matrix: Array<{ year: number; period: ExportPeriod; kind: ExportKind; count: number }>;
}
