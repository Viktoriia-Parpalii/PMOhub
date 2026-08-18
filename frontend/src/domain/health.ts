import { HealthStatus } from '../types';

export interface HealthStatusPresentation {
  label: string;
  badgeClass: string;
  progressClass: string;
  colors: { bg: string; text: string; border: string; main: string };
}

export const healthStatusPresentation: Record<HealthStatus, HealthStatusPresentation> = {
  DEFAULT: { label: 'Без статусу', badgeClass: 'border-slate-200 bg-slate-100 text-slate-600', progressClass: 'bg-slate-400', colors: { bg: 'bg-slate-100', text: 'text-slate-600', border: 'border-slate-300', main: 'bg-slate-300' } },
  GRAY: { label: 'Без статусу', badgeClass: 'border-slate-200 bg-slate-100 text-slate-600', progressClass: 'bg-slate-400', colors: { bg: 'bg-slate-100', text: 'text-slate-600', border: 'border-slate-300', main: 'bg-slate-300' } },
  GREEN: { label: 'Виконано', badgeClass: 'border-emerald-200 bg-emerald-100 text-emerald-700', progressClass: 'bg-emerald-500', colors: { bg: 'bg-emerald-100', text: 'text-emerald-700', border: 'border-emerald-700', main: 'bg-emerald-500' } },
  YELLOW: { label: 'В процесі', badgeClass: 'border-amber-200 bg-amber-100 text-amber-800', progressClass: 'bg-amber-400', colors: { bg: 'bg-amber-100', text: 'text-amber-700', border: 'border-amber-700', main: 'bg-amber-400' } },
  RED: { label: 'На паузі / блоковано', badgeClass: 'border-rose-200 bg-rose-100 text-rose-700', progressClass: 'bg-rose-500', colors: { bg: 'bg-rose-100', text: 'text-rose-700', border: 'border-rose-700', main: 'bg-rose-500' } },
};

export const getHealthStatusPresentation = (status: HealthStatus = 'DEFAULT'): HealthStatusPresentation => healthStatusPresentation[status];
export const getHealthLabel = (status: HealthStatus = 'DEFAULT'): string => getHealthStatusPresentation(status).label;
export const getHealthColors = (status: HealthStatus = 'DEFAULT'): HealthStatusPresentation['colors'] => getHealthStatusPresentation(status).colors;
