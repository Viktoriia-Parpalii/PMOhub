import React, {
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { createPortal } from "react-dom";
import { List, ListOrdered, RemoveFormatting } from "lucide-react";

interface RichTextEditorProps {
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  placeholder?: string;
}

interface RichTextPreviewProps {
  value: string;
  className?: string;
  title?: string;
  maxLines?: number;
}

const preventFocusLoss = (event: React.MouseEvent<HTMLButtonElement>) =>
  event.preventDefault();

const allowedTags = new Set([
  "B",
  "STRONG",
  "I",
  "EM",
  "U",
  "S",
  "STRIKE",
  "BR",
  "DIV",
  "P",
  "UL",
  "OL",
  "LI",
  "SPAN",
  "FONT",
]);
const safeColor = "(?:#[0-9a-f]{3,8}|rgba?\\([^)]{1,48}\\)|[a-z]+)";
const allowedInlineStyle = new RegExp(
  `^\\s*(?:(?:color|background-color)\\s*:\\s*${safeColor}\\s*;?\\s*)+$`,
  "i",
);

export const sanitizeRichText = (value: string): string => {
  if (typeof document === "undefined") return value.replace(/<[^>]*>/g, "");
  const template = document.createElement("template");
  template.innerHTML = value;
  template.content.querySelectorAll("*").forEach((element) => {
    if (!allowedTags.has(element.tagName)) {
      element.replaceWith(...Array.from(element.childNodes));
      return;
    }
    Array.from(element.attributes).forEach((attribute) => {
      const allowedColor =
        (element.tagName === "SPAN" &&
          attribute.name === "style" &&
          allowedInlineStyle.test(attribute.value)) ||
        (element.tagName === "FONT" &&
          attribute.name === "color" &&
          /^#[0-9a-f]{3,8}$/i.test(attribute.value));
      if (!allowedColor) element.removeAttribute(attribute.name);
    });
  });
  return template.innerHTML;
};

const richTextToPlainText = (value: string): string => {
  if (typeof document === "undefined") return value.replace(/<[^>]*>/g, "");
  const template = document.createElement("template");
  template.innerHTML = sanitizeRichText(value);
  return template.content.textContent?.replace(/\s+/g, " ").trim() ?? "";
};

export const RichTextPreview: React.FC<RichTextPreviewProps> = ({
  value,
  className,
  title,
  maxLines = 5,
}) => {
  const [tooltip, setTooltip] = useState<{ x: number; y: number } | null>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);
  const safeHtml = useMemo(() => sanitizeRichText(value), [value]);
  const plainText = richTextToPlainText(title ?? value);
  const updateTooltip = (event: React.MouseEvent<HTMLDivElement>) => {
    const content = contentRef.current;
    if (!content || content.scrollHeight <= content.clientHeight + 1) return;
    const rect = content.getBoundingClientRect();
    const pointerX = Number.isFinite(event.clientX)
      ? event.clientX
      : rect.right;
    const pointerY = Number.isFinite(event.clientY)
      ? event.clientY
      : rect.bottom;
    setTooltip({
      x: pointerX + 14,
      y: pointerY + 14,
    });
  };

  useLayoutEffect(() => {
    if (!tooltip || !tooltipRef.current) return;
    const rect = tooltipRef.current.getBoundingClientRect();
    const sourceX = Number.isFinite(tooltip.x) ? tooltip.x : 12;
    const sourceY = Number.isFinite(tooltip.y) ? tooltip.y : 12;
    const x = Math.max(
      12,
      Math.min(sourceX, window.innerWidth - rect.width - 12),
    );
    const y = Math.max(
      12,
      Math.min(sourceY, window.innerHeight - rect.height - 12),
    );
    if (x !== tooltip.x || y !== tooltip.y) setTooltip({ x, y });
  }, [tooltip]);

  useEffect(() => {
    setTooltip(null);
  }, [value]);

  useEffect(() => {
    if (!tooltip) return;
    const hide = () => setTooltip(null);
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") hide();
    };
    window.addEventListener("blur", hide);
    window.addEventListener("scroll", hide, true);
    window.addEventListener("pointerdown", hide);
    window.addEventListener("keydown", onKeyDown);
    return () => {
      window.removeEventListener("blur", hide);
      window.removeEventListener("scroll", hide, true);
      window.removeEventListener("pointerdown", hide);
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [tooltip]);

  return (
    <div
      onPointerEnter={updateTooltip}
      onPointerMove={updateTooltip}
      onPointerLeave={() => setTooltip(null)}
    >
      <div
        ref={contentRef}
        className={className}
        style={{ maxHeight: `${maxLines * 1.35}em`, overflow: "hidden" }}
        dangerouslySetInnerHTML={{ __html: safeHtml }}
      />
      {tooltip &&
        plainText &&
        typeof document !== "undefined" &&
        createPortal(
          <div
            ref={tooltipRef}
            role="tooltip"
            className="rich-text-tooltip pointer-events-none fixed z-[100] w-[min(32rem,calc(100vw-1.5rem))] rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs leading-5 text-slate-700 shadow-xl"
            style={{ left: tooltip.x, top: tooltip.y }}
            dangerouslySetInnerHTML={{ __html: safeHtml }}
          />,
          document.body,
        )}
    </div>
  );
};

export const RichTextEditor: React.FC<RichTextEditorProps> = ({
  value,
  onChange,
  disabled = false,
  placeholder = "",
}) => {
  const contentRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const safeValue = sanitizeRichText(value);
    if (contentRef.current && contentRef.current.innerHTML !== safeValue) {
      contentRef.current.innerHTML = safeValue;
    }
  }, [value]);

  const updateValue = () =>
    onChange(sanitizeRichText(contentRef.current?.innerHTML ?? ""));
  const format = (command: string, commandValue?: string) => {
    if (disabled) return;
    contentRef.current?.focus();
    document.execCommand(command, false, commandValue);
    updateValue();
  };

  const actionClass =
    "inline-flex h-8 min-w-8 items-center justify-center rounded-md px-2 text-sm font-semibold text-slate-600 transition hover:bg-indigo-50 hover:text-indigo-700 disabled:cursor-not-allowed disabled:opacity-40";

  return (
    <div className="overflow-hidden rounded-xl border border-slate-300 bg-white transition focus-within:border-indigo-400 focus-within:ring-2 focus-within:ring-indigo-100">
      <div className="flex flex-wrap items-center gap-1 border-b border-slate-200 bg-slate-50 px-2 py-1.5">
        <button
          type="button"
          disabled={disabled}
          onMouseDown={preventFocusLoss}
          onClick={() => format("bold")}
          className={actionClass}
          title="Жирний"
        >
          <strong>B</strong>
        </button>
        <button
          type="button"
          disabled={disabled}
          onMouseDown={preventFocusLoss}
          onClick={() => format("italic")}
          className={actionClass}
          title="Курсив"
        >
          <em>I</em>
        </button>
        <button
          type="button"
          disabled={disabled}
          onMouseDown={preventFocusLoss}
          onClick={() => format("underline")}
          className={actionClass}
          title="Підкреслений"
        >
          <span className="underline">U</span>
        </button>
        <button
          type="button"
          disabled={disabled}
          onMouseDown={preventFocusLoss}
          onClick={() => format("strikeThrough")}
          className={actionClass}
          title="Закреслений"
        >
          <span className="line-through">S</span>
        </button>
        <span className="mx-1 h-5 w-px bg-slate-200" />
        <button
          type="button"
          disabled={disabled}
          onMouseDown={preventFocusLoss}
          onClick={() => format("insertUnorderedList")}
          className={actionClass}
          title="Маркований список"
        >
          <List size={16} />
        </button>
        <button
          type="button"
          disabled={disabled}
          onMouseDown={preventFocusLoss}
          onClick={() => format("insertOrderedList")}
          className={actionClass}
          title="Нумерований список"
        >
          <ListOrdered size={16} />
        </button>
        <label
          className="relative inline-flex h-8 w-9 cursor-pointer items-center justify-center rounded-md text-slate-600 hover:bg-indigo-50"
          title="Колір тексту"
        >
          <span className="text-sm font-semibold">A</span>
          <span className="absolute bottom-1 h-0.5 w-4 bg-current" />
          <input
            aria-label="Колір тексту"
            disabled={disabled}
            type="color"
            defaultValue="#1e293b"
            onChange={(event) => format("foreColor", event.target.value)}
            className="absolute inset-0 cursor-pointer opacity-0 disabled:cursor-not-allowed"
          />
        </label>
        <label
          className="relative inline-flex h-8 w-9 cursor-pointer items-center justify-center rounded-md text-slate-600 hover:bg-indigo-50"
          title="Колір фону тексту"
        >
          <span
            className="rounded px-1 text-sm font-semibold text-slate-700"
            style={{ backgroundColor: "#fde68a" }}
          >
            A
          </span>
          <input
            aria-label="Колір фону тексту"
            disabled={disabled}
            type="color"
            defaultValue="#fde68a"
            onChange={(event) => format("hiliteColor", event.target.value)}
            className="absolute inset-0 cursor-pointer opacity-0 disabled:cursor-not-allowed"
          />
        </label>
        <button
          type="button"
          disabled={disabled}
          onMouseDown={preventFocusLoss}
          onClick={() => format("removeFormat")}
          className={actionClass}
          title="Очистити форматування"
        >
          <RemoveFormatting size={16} />
        </button>
      </div>
      <div
        ref={contentRef}
        contentEditable={!disabled}
        suppressContentEditableWarning
        role="textbox"
        aria-multiline="true"
        data-placeholder={placeholder}
        onInput={updateValue}
        onBlur={updateValue}
        className="rich-text-content min-h-32 px-3 py-3 text-sm leading-6 text-slate-700 outline-none empty:before:pointer-events-none empty:before:text-slate-400 empty:before:content-[attr(data-placeholder)]"
      />
    </div>
  );
};
