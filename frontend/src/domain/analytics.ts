import { calculateDepartmentLoads, getInitiativeSize } from './capacity';
import { calculateProgress } from '../utils';
import { Department, HealthStatus, InitiativeSizeDef, OperationalTask, Project, TaskWeightDef } from '../types';

export type AnalyticsCard = (Project | OperationalTask) & { type: 'PROJECT' | 'TASK' };
export type CanonicalHealthStatus = Exclude<HealthStatus, 'GRAY'>;

export const normalizeHealthStatus = (status: HealthStatus): CanonicalHealthStatus => status === 'GRAY' ? 'DEFAULT' : status;

export const healthCounts = (cards: AnalyticsCard[]) => cards.reduce<Record<CanonicalHealthStatus, number>>(
  (counts, card) => {
    counts[normalizeHealthStatus(card.health_status)] += 1;
    return counts;
  },
  { GREEN: 0, YELLOW: 0, RED: 0, DEFAULT: 0 },
);

export const averageScopeProgress = (cards: AnalyticsCard[]): number => {
  const progressValues = cards
    .map(card => calculateProgress(card.checklist))
    .filter((value): value is number => value !== null);
  if (!progressValues.length) return 0;
  return Math.round(progressValues.reduce((sum, value) => sum + value, 0) / progressValues.length);
};

/**
 * The duration of an initiative within a year is the number of its existing
 * quarterly cards. This deliberately does not depend on the currently viewed
 * quarter: it describes the annual planning horizon of each initiative.
 */
export const averageInitiativeDuration = (cards: AnalyticsCard[]): number => {
  const quarterCountByInitiative = new Map<string, number>();
  cards.forEach(card => {
    const initiativeId = card.backlog_id ?? card.id;
    const key = `${card.type}:${initiativeId}`;
    quarterCountByInitiative.set(key, (quarterCountByInitiative.get(key) ?? 0) + 1);
  });

  if (!quarterCountByInitiative.size) return 0;
  const totalQuarters = Array.from(quarterCountByInitiative.values()).reduce((sum, count) => sum + count, 0);
  return Math.round((totalQuarters / quarterCountByInitiative.size) * 10) / 10;
};

export const scopeStatusCounts = (cards: AnalyticsCard[]) => cards.flatMap(card => card.checklist).reduce<Record<CanonicalHealthStatus, number>>(
  (counts, item) => {
    counts[normalizeHealthStatus(item.color ?? 'DEFAULT')] += 1;
    return counts;
  },
  { GREEN: 0, YELLOW: 0, RED: 0, DEFAULT: 0 },
);

export const capacityByQuarter = (
  cards: AnalyticsCard[],
  departments: Department[],
  taskWeights: TaskWeightDef[],
) => (['Q1', 'Q2', 'Q3', 'Q4'] as const).map(quarter => ({
  quarter,
  loads: calculateDepartmentLoads(cards.filter(card => card.quarter === quarter), departments, taskWeights),
}));

export const sizeBreakdown = (
  cards: AnalyticsCard[],
  taskWeights: TaskWeightDef[],
  sizes: InitiativeSizeDef[],
) => {
  const counts = new Map<string, number>();
  cards.forEach(card => {
    const weight = card.checklist.reduce((sum, item) => {
      const definition = taskWeights.find(candidate => candidate.id === item.weightId && candidate.is_active);
      return sum + (definition?.weight ?? 0);
    }, 0);
    const name = getInitiativeSize(weight, sizes);
    counts.set(name, (counts.get(name) ?? 0) + 1);
  });
  return Array.from(counts, ([name, count]) => ({ name, count })).sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));
};
