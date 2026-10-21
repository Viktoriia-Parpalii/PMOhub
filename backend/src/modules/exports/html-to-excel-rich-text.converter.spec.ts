import { describe, expect, it } from "vitest";
import { HtmlToExcelRichTextConverter } from "./html-to-excel-rich-text.converter";

describe("HtmlToExcelRichTextConverter", () => {
  const converter = new HtmlToExcelRichTextConverter();

  it("preserves supported inline formatting and list structure", () => {
    const result = converter.convert(
      '<p><strong>Важливо</strong> <span style="color:#ff0000"><em>сьогодні</em></span></p><ol><li>Перший</li><li>Другий</li></ol>',
    );
    expect(result.map((run) => run.text).join("")).toContain("Важливо сьогодні");
    expect(result.map((run) => run.text).join("")).toContain("1. Перший");
    expect(result.map((run) => run.text).join("")).toContain("2. Другий");
    expect(result.some((run) => run.font?.bold && run.text.includes("Важливо"))).toBe(true);
    expect(result.some((run) => run.font?.italic && run.font?.color?.argb === "FFFF0000")).toBe(true);
  });

  it("removes unsafe markup", () => {
    const result = converter.convert('<script>alert(1)</script><p onclick="evil()">Текст</p>');
    expect(result.map((run) => run.text).join("")).toBe("Текст");
  });
});
