import { describe, expect, it } from 'vitest';
import {
  initialDepartments,
  initialProjects,
  initialTaskWeights,
  initialTasks,
} from './demoData';
import { validateChecklistCapacity } from './domain/capacity';
import { getChainId, reconcileBacklogYears } from './domain/initiatives';

describe('розширений демо-набір', () => {
  it('містить валідні квартальні картки, підготовчі етапи та пов’язані річні записи', () => {
    const projects = reconcileBacklogYears(initialProjects);
    const tasks = reconcileBacklogYears(initialTasks);
    const records = [...projects, ...tasks];
    const cards = records.filter(record => !record.is_backlog);
    const masters = records.filter(record => record.is_backlog);

    expect(initialDepartments.length).toBeGreaterThanOrEqual(8);
    expect(masters.length).toBeGreaterThanOrEqual(8);
    expect(cards.length).toBeGreaterThanOrEqual(12);

    masters.forEach(master => {
      const snapshot = master.yearSnapshots?.[String(master.year)];
      expect(snapshot?.year).toBe(master.year);
      expect(snapshot?.preparationStage).toBeDefined();
    });

    cards.forEach(card => {
      expect(validateChecklistCapacity(card.checklist, initialTaskWeights)).toEqual([]);
      const parent = masters.find(master => master.id === card.backlog_id);
      expect(parent).toBeDefined();
      expect(getChainId(parent!)).toBe(getChainId(card));
    });
  });
});
