import { describe, expect, it } from "vitest";
import { sanitizeRichText } from "./rich-text";

describe("sanitizeRichText", () => {
  it("removes scripts, event handlers and unsafe URLs", () => {
    const result = sanitizeRichText(
      '<p onclick="alert(1)">Текст<script>alert(1)</script><img src=x onerror=alert(2)></p>',
    );
    expect(result).toBe("<p>Текст</p>");
  });

  it("keeps supported formatting and safe colors", () => {
    expect(
      sanitizeRichText('<strong>Текст</strong><span style="color:#123456">!</span>'),
    ).toBe('<strong>Текст</strong><span style="color:#123456">!</span>');
  });
});
