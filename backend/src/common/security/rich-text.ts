import sanitizeHtml from "sanitize-html";

const color = [/^#[0-9a-f]{3,8}$/i, /^rgba?\([^)]+\)$/i, /^[a-z]+$/i];

/** Canonical allow-list for rich text persisted by the API. */
export const sanitizeRichText = (value: string): string =>
  sanitizeHtml(value, {
    allowedTags: [
      "b",
      "strong",
      "i",
      "em",
      "u",
      "s",
      "strike",
      "br",
      "div",
      "p",
      "ul",
      "ol",
      "li",
      "span",
      "font",
    ],
    allowedAttributes: {
      span: ["style"],
      font: ["color"],
    },
    allowedStyles: {
      span: {
        color,
        "background-color": color,
      },
    },
    disallowedTagsMode: "discard",
  }).trim();
