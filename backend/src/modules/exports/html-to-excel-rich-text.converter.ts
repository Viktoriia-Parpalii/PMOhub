import { Injectable } from "@nestjs/common";
import ExcelJS from "exceljs";
import sanitizeHtml from "sanitize-html";

type Font = NonNullable<ExcelJS.RichText["font"]>;

const decodeEntities = (value: string) =>
  value
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;|&apos;/gi, "'")
    .replace(/&#(\d+);/g, (_match, code: string) => String.fromCodePoint(Number(code)));

const excelColor = (value?: string) => {
  const match = value?.trim().match(/^#?([0-9a-f]{6})$/i);
  return match ? `FF${match[1].toUpperCase()}` : undefined;
};

@Injectable()
export class HtmlToExcelRichTextConverter {
  convert(source: string | null): ExcelJS.RichText[] {
    if (!source?.trim()) return [];
    const html = sanitizeHtml(source, {
      allowedTags: [
        "b", "strong", "i", "em", "u", "s", "strike", "p", "div", "br",
        "ul", "ol", "li", "span", "font",
      ],
      allowedAttributes: { span: ["style"], font: ["color"], "*": [] },
      allowedStyles: { "*": { color: [/^#[0-9a-f]{6}$/i, /^rgb\(\s*\d+\s*,\s*\d+\s*,\s*\d+\s*\)$/i] } },
    });
    const result: ExcelJS.RichText[] = [];
    const styles: Font[] = [{}];
    const lists: Array<{ type: "ul" | "ol"; index: number }> = [];
    const tokens = html.match(/<[^>]+>|[^<]+/g) ?? [];

    const pushText = (text: string) => {
      if (!text) return;
      const font = styles[styles.length - 1];
      const previous = result[result.length - 1];
      if (previous && JSON.stringify(previous.font ?? {}) === JSON.stringify(font)) previous.text += text;
      else result.push({ text, font: { ...font } });
    };
    const newline = () => {
      if (result.length && !result[result.length - 1].text.endsWith("\n")) pushText("\n");
    };

    for (const token of tokens) {
      if (!token.startsWith("<")) {
        pushText(decodeEntities(token.replace(/\s+/g, " ")));
        continue;
      }
      const closing = /^<\//.test(token);
      const tag = token.match(/^<\/?\s*([a-z0-9]+)/i)?.[1]?.toLowerCase();
      if (!tag) continue;
      if (closing) {
        if (["b", "strong", "i", "em", "u", "s", "strike", "span", "font"].includes(tag)) {
          if (styles.length > 1) styles.pop();
        }
        if (tag === "li" || tag === "p" || tag === "div") newline();
        if (tag === "ul" || tag === "ol") {
          lists.pop();
          newline();
        }
        continue;
      }
      if (tag === "br") {
        newline();
        continue;
      }
      if (tag === "ul" || tag === "ol") {
        lists.push({ type: tag, index: 0 });
        newline();
        continue;
      }
      if (tag === "li") {
        newline();
        const list = lists[lists.length - 1] ?? { type: "ul" as const, index: 0 };
        list.index += 1;
        pushText(list.type === "ol" ? `${list.index}. ` : "• ");
        continue;
      }
      if (tag === "p" || tag === "div") {
        newline();
        continue;
      }
      const current: Font = { ...styles[styles.length - 1] };
      if (tag === "b" || tag === "strong") current.bold = true;
      if (tag === "i" || tag === "em") current.italic = true;
      if (tag === "u") current.underline = true;
      if (tag === "s" || tag === "strike") current.strike = true;
      if (tag === "span" || tag === "font") {
        const raw = token.match(/(?:color\s*:\s*|color=["']?)(#[0-9a-f]{6})/i)?.[1];
        const argb = excelColor(raw);
        if (argb) current.color = { argb };
      }
      if (["b", "strong", "i", "em", "u", "s", "strike", "span", "font"].includes(tag)) {
        styles.push(current);
      }
    }
    while (result.length && !result[result.length - 1].text.trim()) result.pop();
    if (result.length) result[result.length - 1].text = result[result.length - 1].text.replace(/\n+$/, "");
    while (result.length && !result[result.length - 1].text) result.pop();
    return result;
  }
}
