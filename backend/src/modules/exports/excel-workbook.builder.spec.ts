import ExcelJS from "exceljs";
import { describe, expect, it } from "vitest";
import { ExcelWorkbookBuilder } from "./excel-workbook.builder";
import { ExportSummaryService } from "./export-summary.service";
import { HtmlToExcelRichTextConverter } from "./html-to-excel-rich-text.converter";

const decimal = (value: number) => ({ toNumber: () => value, toString: () => String(value) });

describe("ExcelWorkbookBuilder", () => {
  it("creates summary, backlog and styled quarter sheets", async () => {
    const builder = new ExcelWorkbookBuilder(
      new ExportSummaryService(),
      new HtmlToExcelRichTextConverter(),
    );
    const status = { id: "status", code: "ACTIVE", name: "У процесі", color: "#F59E0B" };
    const dataset = {
      years: [
        {
          id: "year",
          year: 2026,
          strategicGoal: "Ціль",
          initiative: { id: "initiative", kind: "PROJECT", name: "Нова ініціатива" },
          preparationStage: null,
          quarterCards: [{ id: "card", quarter: 1, status }],
        },
      ],
      departments: [{ id: "department", name: "IT", capacityLimitPoints: decimal(20) }],
      customFields: [],
      cards: [
        {
          id: "card",
          quarter: 1,
          initiativeYear: {
            id: "year",
            year: 2026,
            strategicGoal: "Ціль",
            initiative: { id: "initiative", kind: "PROJECT", name: "Нова ініціатива" },
          },
          manager: { id: "manager", name: "Менеджер" },
          priority: { id: "priority", name: "Високий" },
          status,
          sizeSnapshotName: "M",
          totalWeight: decimal(5),
          departments: [{ departmentId: "department", department: { id: "department", name: "IT" } }],
          scopeItems: [
            {
              text: "Підготувати реліз",
              statusCode: "YELLOW",
              weightSnapshotName: "M",
              weightSnapshotValue: decimal(5),
              executors: [{ departmentId: "department", department: { id: "department", name: "IT" } }],
            },
          ],
          customFieldValues: [],
          notes: "<p><strong>Важлива</strong> примітка</p>",
        },
      ],
    };
    const buffer = await builder.build(
      dataset as never,
      { years: { from: 2026, to: 2026 }, periods: ["BACKLOG", "Q1"], kinds: ["PROJECT"] },
      {
        id: "actor",
        name: "Адміністратор",
        email: "admin@example.com",
        role: "SUPER_ADMIN",
        must_change_password: false,
      },
    );
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(
      buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength) as ArrayBuffer,
    );
    expect(workbook.worksheets.map((sheet) => sheet.name)).toEqual([
      "Зведення",
      "Беклог_2026_Проєкти",
      "Q1_2026_Проєкти",
    ]);
    const quarter = workbook.getWorksheet("Q1_2026_Проєкти")!;
    expect(quarter.getCell("B2").value).toBe("Нова ініціатива");
    expect((quarter.getCell("B2").fill as ExcelJS.FillPattern).fgColor?.argb).toBe("FFF59E0B");
    expect(JSON.stringify(quarter.getCell("K2").value)).toContain("Підготувати реліз");
    expect(JSON.stringify(quarter.getCell("L2").value)).toContain("Важлива");
  });
});
