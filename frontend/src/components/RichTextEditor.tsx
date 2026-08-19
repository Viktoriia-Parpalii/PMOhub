import React, { useEffect, useRef, useState } from 'react';
import { List, ListOrdered, RemoveFormatting } from 'lucide-react';

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
}

const preventFocusLoss = (event: React.MouseEvent<HTMLButtonElement>) => event.preventDefault();

const allowedTags = new Set(['B', 'STRONG', 'I', 'EM', 'U', 'S', 'STRIKE', 'BR', 'DIV', 'P', 'UL', 'OL', 'LI', 'SPAN', 'FONT']);
const safeColor = '(?:#[0-9a-f]{3,8}|rgba?\\([^)]{1,48}\\)|[a-z]+)';
const allowedInlineStyle = new RegExp(`^\\s*(?:(?:color|background-color)\\s*:\\s*${safeColor}\\s*;?\\s*)+$`, 'i');

export const sanitizeRichText = (value: string): string => {
  if (typeof document === 'undefined') return value.replace(/<[^>]*>/g, '');
  const template = document.createElement('template');
  template.innerHTML = value;
  template.content.querySelectorAll('*').forEach(element => {
    if (!allowedTags.has(element.tagName)) {
      element.replaceWith(...Array.from(element.childNodes));
      return;
    }
    Array.from(element.attributes).forEach(attribute => {
      const allowedColor = (element.tagName === 'SPAN' && attribute.name === 'style' && allowedInlineStyle.test(attribute.value))
        || (element.tagName === 'FONT' && attribute.name === 'color' && /^#[0-9a-f]{3,8}$/i.test(attribute.value));
      if (!allowedColor) element.removeAttribute(attribute.name);
    });
  });
  return template.innerHTML;
};

const richTextToPlainText = (value: string): string => {
  if (typeof document === 'undefined') return value.replace(/<[^>]*>/g, '');
  const template = document.createElement('template');
  template.innerHTML = sanitizeRichText(value);
  return template.content.textContent?.replace(/\s+/g, ' ').trim() ?? '';
};

export const RichTextPreview: React.FC<RichTextPreviewProps> = ({ value, className, title }) => {
  const [tooltip, setTooltip] = useState<{ x: number; y: number } | null>(null);
  const plainText = richTextToPlainText(title ?? value);
  const updateTooltip = (event: React.MouseEvent<HTMLDivElement>) => setTooltip({ x: event.clientX + 14, y: event.clientY + 14 });

  return (
    <div onMouseEnter={updateTooltip} onMouseMove={updateTooltip} onMouseLeave={() => setTooltip(null)}>
      <div className={className} dangerouslySetInnerHTML={{ __html: sanitizeRichText(value) }} />
      {tooltip && plainText && <div role="tooltip" className="pointer-events-none fixed z-[100] max-w-sm rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs leading-5 text-slate-700 shadow-xl" style={{ left: tooltip.x, top: tooltip.y }}>{plainText}</div>}
    </div>
  );
};

export const RichTextEditor: React.FC<RichTextEditorProps> = ({ value, onChange, disabled = false, placeholder = '' }) => {
  const contentRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (contentRef.current && contentRef.current.innerHTML !== value) {
      contentRef.current.innerHTML = value;
    }
  }, [value]);

  const updateValue = () => onChange(contentRef.current?.innerHTML ?? '');
  const format = (command: string, commandValue?: string) => {
    if (disabled) return;
    contentRef.current?.focus();
    document.execCommand(command, false, commandValue);
    updateValue();
  };

  const actionClass = 'inline-flex h-8 min-w-8 items-center justify-center rounded-md px-2 text-sm font-semibold text-slate-600 transition hover:bg-indigo-50 hover:text-indigo-700 disabled:cursor-not-allowed disabled:opacity-40';

  return (
    <div className="overflow-hidden rounded-xl border border-slate-300 bg-white transition focus-within:border-indigo-400 focus-within:ring-2 focus-within:ring-indigo-100">
      <div className="flex flex-wrap items-center gap-1 border-b border-slate-200 bg-slate-50 px-2 py-1.5">
        <button type="button" disabled={disabled} onMouseDown={preventFocusLoss} onClick={() => format('bold')} className={actionClass} title="Жирний"><strong>B</strong></button>
        <button type="button" disabled={disabled} onMouseDown={preventFocusLoss} onClick={() => format('italic')} className={actionClass} title="Курсив"><em>I</em></button>
        <button type="button" disabled={disabled} onMouseDown={preventFocusLoss} onClick={() => format('underline')} className={actionClass} title="Підкреслений"><span className="underline">U</span></button>
        <button type="button" disabled={disabled} onMouseDown={preventFocusLoss} onClick={() => format('strikeThrough')} className={actionClass} title="Закреслений"><span className="line-through">S</span></button>
        <span className="mx-1 h-5 w-px bg-slate-200" />
        <button type="button" disabled={disabled} onMouseDown={preventFocusLoss} onClick={() => format('insertUnorderedList')} className={actionClass} title="Маркований список"><List size={16} /></button>
        <button type="button" disabled={disabled} onMouseDown={preventFocusLoss} onClick={() => format('insertOrderedList')} className={actionClass} title="Нумерований список"><ListOrdered size={16} /></button>
        <label className="relative inline-flex h-8 w-9 cursor-pointer items-center justify-center rounded-md text-slate-600 hover:bg-indigo-50" title="Колір тексту">
          <span className="text-sm font-semibold">A</span>
          <span className="absolute bottom-1 h-0.5 w-4 bg-current" />
          <input aria-label="Колір тексту" disabled={disabled} type="color" defaultValue="#1e293b" onChange={event => format('foreColor', event.target.value)} className="absolute inset-0 cursor-pointer opacity-0 disabled:cursor-not-allowed" />
        </label>
        <label className="relative inline-flex h-8 w-9 cursor-pointer items-center justify-center rounded-md text-slate-600 hover:bg-indigo-50" title="Колір фону тексту">
          <span className="rounded px-1 text-sm font-semibold text-slate-700" style={{ backgroundColor: '#fde68a' }}>A</span>
          <input aria-label="Колір фону тексту" disabled={disabled} type="color" defaultValue="#fde68a" onChange={event => format('hiliteColor', event.target.value)} className="absolute inset-0 cursor-pointer opacity-0 disabled:cursor-not-allowed" />
        </label>
        <button type="button" disabled={disabled} onMouseDown={preventFocusLoss} onClick={() => format('removeFormat')} className={actionClass} title="Очистити форматування"><RemoveFormatting size={16} /></button>
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
