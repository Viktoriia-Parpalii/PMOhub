import { HealthStatus, InitiativeStatusDef } from '../types';
import { colorWithAlpha } from './priority';

export interface HealthStatusPresentation {
  label: string;
  badgeClass: string;
  progressClass: string;
  colors: { bg: string; text: string; border: string; main: string };
}

const legacy: Record<string, { label: string; color: string }> = {
  DEFAULT: { label: 'Без статусу', color: '#94a3b8' }, GRAY: { label: 'Без статусу', color: '#94a3b8' },
  GREEN: { label: 'Виконано', color: '#10b981' }, YELLOW: { label: 'В процесі', color: '#f59e0b' }, RED: { label: 'На паузі / блоковано', color: '#f43f5e' },
};

export const getInitiativeStatus = (status: HealthStatus = 'DEFAULT', statuses: InitiativeStatusDef[] = []): InitiativeStatusDef => {
  const configured = statuses.find(item => item.id === status);
  if (configured) return configured;
  const fallback = legacy[status] ?? legacy.DEFAULT;
  return { id: status, name: fallback.label, color: fallback.color, is_active: false };
};

export const getInitiativeStatusStyle = (status: HealthStatus, statuses: InitiativeStatusDef[]): React.CSSProperties => {
  const color = getInitiativeStatus(status, statuses).color;
  return { color, borderColor: colorWithAlpha(color, 0.32), backgroundColor: colorWithAlpha(color, 0.13) };
};

export const getHealthStatusPresentation = (status: HealthStatus = 'DEFAULT'): HealthStatusPresentation => {
  const item = getInitiativeStatus(status);
  return { label: item.name, badgeClass: 'border-slate-200 bg-slate-100 text-slate-700', progressClass: 'bg-slate-400', colors: { bg: 'bg-slate-100', text: 'text-slate-600', border: 'border-slate-300', main: 'bg-slate-300' } };
};
export const getHealthLabel = (status: HealthStatus = 'DEFAULT'): string => getInitiativeStatus(status).name;
export const getHealthColors = (status: HealthStatus = 'DEFAULT'): HealthStatusPresentation['colors'] => getHealthStatusPresentation(status).colors;
