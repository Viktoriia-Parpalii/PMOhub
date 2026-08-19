import { PriorityDef } from '../types';

const fallbackColor = '#64748b';

export const colorWithAlpha = (color: string | undefined, alpha: number): string => {
  const hex = (color ?? fallbackColor).replace('#', '');
  if (!/^[0-9a-f]{6}$/i.test(hex)) return `rgba(100, 116, 139, ${alpha})`;
  const value = Number.parseInt(hex, 16);
  return `rgba(${(value >> 16) & 255}, ${(value >> 8) & 255}, ${value & 255}, ${alpha})`;
};

export const getPriorityDefinition = (priorityId: string | undefined, priorities: PriorityDef[]): PriorityDef | undefined => priorities.find(item => item.id === priorityId);

export const getPriorityBadgeStyle = (priorityId: string | undefined, priorities: PriorityDef[]): React.CSSProperties => {
  const color = getPriorityDefinition(priorityId, priorities)?.color ?? fallbackColor;
  return { color, borderColor: colorWithAlpha(color, 0.32), backgroundColor: colorWithAlpha(color, 0.13) };
};

// Compatibility helper for external consumers. New UI should use getPriorityBadgeStyle.
export const getPriorityBadgeClass = (_priorityId?: string): string => 'border-slate-200 bg-slate-100 text-slate-700';
