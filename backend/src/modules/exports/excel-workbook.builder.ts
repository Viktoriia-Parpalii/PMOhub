import { Injectable } from "@nestjs/common";
import ExcelJS from "exceljs";
import { AuthUser } from "../../common/auth/auth-user";
import { InitiativeExportFilterDto, ExportKind } from "./export.dto";
import {
  ExportCard,
  ExportCustomField,
  InitiativeExportDataset,
} from "./initiative-export-query.service";
import { ExportSummaryService } from "./export-summary.service";
import { HtmlToExcelRichTextConverter } from "./html-to-excel-rich-text.converter";

const COLORS = {
  indigo: "FF4F46E5",
  indigoLight: "FFEEF2FF",
  slate900: "FF0F172A",
  slate700: "FF334155",
  slate500: "FF64748B",
  slate200: "FFE2E8F0",
  slate50: "FFF8FAFC",
  white: "FFFFFFFF",
};
const SCOPE_COLORS: Record<string, string> = {
  DEFAULT: "FF64748B",
  GREEN: "FF10B981",
  YELLOW: "FFF59E0B",
  RED: "FFF43F5E",
};
const SCOPE_LABELS: Record<string, string> = {
  DEFAULT: "Без статусу",
  GREEN: "Виконано",
  YELLOW: "У процесі",
  RED: "Заблоковано",
};
const KIND_LABEL: Record<ExportKind, string> = {
  PROJECT: "Проєкти",
  OPERATIONAL_TASK: "Операційні задачі",
};

const safeText = (value: unknown) => {
  const text = value == null ? "" : String(value);
  return /^[=+\-@]/.test(text) ? `'${text}` : text;
};
const argb = (color?: string | null) => {
  const value = color?.replace("#", "");
  return value && /^[0-9a-f]{6}$/i.test(value) ? `FF${value.toUpperCase()}` : COLORS.slate200;
};
const contrastingText = (color?: string | null) => {
  const value = color?.replace("#", "");
  if (!value || !/^[0-9a-f]{6}$/i.test(value)) return COLORS.slate900;
  const [r, g, b] = [0, 2, 4].map((offset) => parseInt(value.slice(offset, offset + 2), 16));
  return (r * 299 + g * 587 + b * 114) / 1000 > 150 ? COLORS.slate900 : COLORS.white;
};

@Injectable()
export class ExcelWorkbookBuilder {
  constructor(
    private readonly summaries: ExportSummaryService,
    private readonly notes: HtmlToExcelRichTextConverter,
  ) {}

  async build(dataset: InitiativeExportDataset, filter: InitiativeExportFilterDto, actor: AuthUser) {
    const workbook = new ExcelJS.Workbook();
    workbook.creator = "PMO Hub";
    workbook.created = new Date();
    workbook.modified = new Date();
    this.addSummary(workbook, dataset, filter, actor);
    for (let year = filter.years.from; year <= filter.years.to; year += 1) {
      for (const kind of filter.kinds) {
        if (filter.periods.includes("BACKLOG")) this.addBacklog(workbook, dataset, year, kind);
        for (const quarter of [1, 2, 3, 4]) {
          if (filter.periods.includes(`Q${quarter}` as "Q1")) {
            this.addQuarter(workbook, dataset, year, quarter, kind);
          }
        }
      }
    }
    const bytes = await workbook.xlsx.writeBuffer();
    return Buffer.from(bytes);
  }

  private addSummary(
    workbook: ExcelJS.Workbook,
    dataset: InitiativeExportDataset,
    filter: InitiativeExportFilterDto,
    actor: AuthUser,
  ) {
    const summary = this.summaries.build(dataset, filter);
    const sheet = workbook.addWorksheet("Зведення", { views: [{ state: "frozen", ySplit: 5 }] });
    sheet.columns = [{ width: 34 }, { width: 22 }, { width: 22 }, { width: 22 }];
    sheet.mergeCells("A1:D1");
    sheet.getCell("A1").value = "Зведення експорту PMO Hub";
    sheet.getCell("A1").font = { bold: true, size: 18, color: { argb: COLORS.white } };
    sheet.getCell("A1").fill = { type: "pattern", pattern: "solid", fgColor: { argb: COLORS.indigo } };
    sheet.getCell("A1").alignment = { vertical: "middle" };
    sheet.getRow(1).height = 34;
    sheet.addRow(["Сформовано", new Date().toISOString(), "Користувач", actor.name]);
    sheet.addRow(["Роки", `${filter.years.from}–${filter.years.to}`, "Періоди", filter.periods.join(", ")]);
    sheet.addRow(["Типи", filter.kinds.map((kind) => KIND_LABEL[kind]).join(", ")]);
    sheet.addRow([]);
    this.addTableSection(sheet, "Ключові показники", [
      ["Записів беклогу", summary.backlog_records],
      ["Квартальних карток", summary.quarter_cards],
      ["Загальна вага", summary.total_weight],
      ["Середній прогрес", `${summary.average_progress}%`],
    ]);
    this.addMapSection(sheet, "Розподіл за статусами", summary.by_status);
    this.addMapSection(sheet, "Статуси завдань скоупу", summary.by_scope_status, SCOPE_LABELS);
    this.addMapSection(sheet, "Структура за розміром", summary.by_size);
    this.addTableSection(
      sheet,
      "Топ менеджерів",
      summary.top_managers.map((item) => [item.name, item.cards, item.weight]),
      ["Менеджер", "Картки", "Вага"],
    );
    this.addTableSection(
      sheet,
      "Завантаження підрозділів",
      summary.department_load.map((item) => [item.name, item.load, item.limit, item.limit - item.load]),
      ["Підрозділ", "Навантаження", "Ліміт", "Резерв"],
    );
    sheet.eachRow((row) => {
      row.alignment = { vertical: "middle", wrapText: true };
    });
  }

  private addBacklog(
    workbook: ExcelJS.Workbook,
    dataset: InitiativeExportDataset,
    year: number,
    kind: ExportKind,
  ) {
    const rows = dataset.years.filter((item) => item.year === year && item.initiative.kind === kind);
    if (!rows.length) return;
    const sheet = workbook.addWorksheet(this.sheetName(`Беклог_${year}_${KIND_LABEL[kind]}`, workbook));
    this.configureDataSheet(sheet, [7, 42, 48, 18, 18, 18, 18]);
    this.addHeader(sheet, ["№", "Назва", "Стратегічна ціль", "Q1", "Q2", "Q3", "Q4"]);
    rows.forEach((item, index) => {
      const row = sheet.addRow([
        index + 1,
        safeText(item.initiative.name),
        safeText(item.strategicGoal),
        ...[1, 2, 3, 4].map((quarter) => {
          const card = item.quarterCards.find((candidate) => candidate.quarter === quarter);
          return card ? card.status.name : "—";
        }),
      ]);
      [1, 2, 3, 4].forEach((quarter, offset) => {
        const card = item.quarterCards.find((candidate) => candidate.quarter === quarter);
        if (!card || card.status.code === "DEFAULT") return;
        const cell = row.getCell(4 + offset);
        cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: argb(card.status.color) } };
        cell.font = { bold: true, color: { argb: contrastingText(card.status.color) } };
      });
      this.styleDataRow(row, index);
    });
    sheet.autoFilter = { from: "A1", to: "G1" };
  }

  private addQuarter(
    workbook: ExcelJS.Workbook,
    dataset: InitiativeExportDataset,
    year: number,
    quarter: number,
    kind: ExportKind,
  ) {
    const cards = dataset.cards.filter(
      (card) => card.initiativeYear.year === year && card.quarter === quarter && card.initiativeYear.initiative.kind === kind,
    );
    if (!cards.length) return;
    const entityType = kind === "PROJECT" ? "project" : "task";
    const customFields = dataset.customFields.filter(
      (field) => field.entityType === entityType &&
        (field.isActive || cards.some((card) => card.customFieldValues.some((value) => value.definitionId === field.id))),
    );
    const headers = [
      "№", "Назва", "Стратегічна ціль", "Менеджер", "Пріоритет", "Залучені підрозділи",
      "Статус", "Розмір", "Загальна вага", "Прогрес", "Скоуп", "Примітки",
      ...customFields.map((field) => field.name),
    ];
    const widths = [7, 38, 42, 24, 18, 34, 18, 14, 16, 13, 64, 54, ...customFields.map(() => 24)];
    const sheet = workbook.addWorksheet(this.sheetName(`Q${quarter}_${year}_${KIND_LABEL[kind]}`, workbook));
    this.configureDataSheet(sheet, widths);
    this.addHeader(sheet, headers);
    cards.forEach((card, index) => {
      const executors = new Set(card.scopeItems.flatMap((item) => item.executors.map((link) => link.departmentId)));
      const involved = card.departments
        .filter((link) => !executors.has(link.departmentId))
        .map((link) => link.department.name)
        .join(", ");
      const row = sheet.addRow([
        index + 1,
        safeText(card.initiativeYear.initiative.name),
        safeText(card.initiativeYear.strategicGoal),
        safeText(card.manager?.name),
        safeText(card.priority?.name),
        safeText(involved),
        safeText(card.status.name),
        safeText(card.sizeSnapshotName || "Не визначено"),
        card.totalWeight.toNumber(),
        this.summaries.cardProgress(card) / 100,
        "",
        "",
        ...customFields.map((field) => this.customFieldValue(card, field)),
      ]);
      row.getCell(10).numFmt = "0%";
      row.getCell(11).value = { richText: this.scopeRichText(card) };
      const noteRuns = this.notes.convert(card.notes);
      row.getCell(12).value = noteRuns.length ? { richText: noteRuns } : "";
      if (card.status.code !== "DEFAULT") {
        row.getCell(2).fill = { type: "pattern", pattern: "solid", fgColor: { argb: argb(card.status.color) } };
        row.getCell(2).font = { bold: true, color: { argb: contrastingText(card.status.color) } };
      }
      row.height = Math.min(180, Math.max(34, card.scopeItems.length * 34));
      this.styleDataRow(row, index);
    });
    sheet.autoFilter = { from: { row: 1, column: 1 }, to: { row: 1, column: headers.length } };
  }

  private scopeRichText(card: ExportCard): ExcelJS.RichText[] {
    if (!card.scopeItems.length) return [{ text: "Скоуп відсутній", font: { italic: true, color: { argb: COLORS.slate500 } } }];
    return card.scopeItems.flatMap((item, index) => [
      {
        text: `${index ? "\n\n" : ""}● ${safeText(item.text)}\n`,
        font: { bold: true, color: { argb: SCOPE_COLORS[item.statusCode] ?? COLORS.slate500 } },
      },
      {
        text: `${SCOPE_LABELS[item.statusCode] ?? item.statusCode} · Вага: ${safeText(item.weightSnapshotName)} — ${item.weightSnapshotValue.toNumber()} балів · Виконавці: ${safeText(item.executors.map((link) => link.department.name).join(", ") || "Не визначено")}`,
        font: { color: { argb: COLORS.slate700 } },
      },
    ]);
  }

  private customFieldValue(card: ExportCard, field: ExportCustomField) {
    const value = card.customFieldValues.find((candidate) => candidate.definitionId === field.id);
    if (!value) return "";
    if (value.booleanValue != null) return value.booleanValue ? "Так" : "Ні";
    if (value.numberValue != null) return value.numberValue.toNumber();
    return safeText(value.textValue ?? value.optionValue ?? (value.dateValue ? value.dateValue.toISOString().slice(0, 10) : ""));
  }

  private configureDataSheet(sheet: ExcelJS.Worksheet, widths: number[]) {
    sheet.views = [{ state: "frozen", ySplit: 1, xSplit: 2 }];
    sheet.columns = widths.map((width) => ({ width }));
    sheet.properties.defaultRowHeight = 24;
  }

  private addHeader(sheet: ExcelJS.Worksheet, headers: string[]) {
    const row = sheet.addRow(headers);
    row.height = 32;
    row.eachCell((cell) => {
      cell.font = { bold: true, color: { argb: COLORS.white } };
      cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: COLORS.indigo } };
      cell.alignment = { vertical: "middle", horizontal: "center", wrapText: true };
      cell.border = { bottom: { style: "thin", color: { argb: COLORS.slate200 } } };
    });
  }

  private styleDataRow(row: ExcelJS.Row, index: number) {
    row.eachCell({ includeEmpty: true }, (cell) => {
      if (index % 2 === 1 && !cell.fill.type) {
        cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: COLORS.slate50 } };
      }
      cell.alignment = { vertical: "top", wrapText: true };
      cell.border = { bottom: { style: "hair", color: { argb: COLORS.slate200 } } };
    });
  }

  private addTableSection(
    sheet: ExcelJS.Worksheet,
    title: string,
    rows: Array<Array<string | number>>,
    headers: string[] = ["Показник", "Значення"],
  ) {
    sheet.addRow([]);
    const titleRow = sheet.addRow([title]);
    titleRow.getCell(1).font = { bold: true, size: 13, color: { argb: COLORS.slate900 } };
    const header = sheet.addRow(headers);
    header.eachCell((cell) => {
      cell.font = { bold: true, color: { argb: COLORS.white } };
      cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: COLORS.indigo } };
    });
    rows.forEach((values, index) => {
      const row = sheet.addRow(values);
      if (index % 2) row.eachCell((cell) => (cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: COLORS.slate50 } }));
    });
  }

  private addMapSection(
    sheet: ExcelJS.Worksheet,
    title: string,
    values: Record<string, number>,
    labels: Record<string, string> = {},
  ) {
    this.addTableSection(
      sheet,
      title,
      Object.entries(values).map(([key, value]) => [labels[key] ?? key, value]),
    );
  }

  private sheetName(source: string, workbook: ExcelJS.Workbook) {
    const clean = source.replace(/[\\/*?:[\]]/g, "_").slice(0, 31);
    if (!workbook.getWorksheet(clean)) return clean;
    let index = 2;
    while (workbook.getWorksheet(`${clean.slice(0, 27)}_${index}`)) index += 1;
    return `${clean.slice(0, 27)}_${index}`;
  }
}
