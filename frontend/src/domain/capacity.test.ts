import { describe, expect, it } from 'vitest';
import { calculateCardDepartmentLoads, getInitiativeSize, getInitiativeWeight, getTaskWeightOptionLabel, validateChecklistAssignments } from './capacity';
import { Department, InitiativeViewModel, TaskWeightDef } from '../shared/types';

const weights: TaskWeightDef[] = [
  { id: 'S', name: 'S', weight: 3, is_active: true },
  { id: 'L', name: 'L', weight: 5, is_active: true },
];
const card: InitiativeViewModel = {
  id: 'C1', initiative_id: 'I1', initiative_year_id: 'Y1', record_type: 'CARD', name: 'Card', strategic_goal: 'Goal', manager_id: 'M1', priority: 'High',
  implementer_dept_ids: ['D1', 'D2'], cross_functional_dept_ids: ['D3', 'D4'], year: 2026, quarter: 'Q3',
  health_status: 'DEFAULT', checklist: [
    { id: 'I1', text: 'One', weightId: 'S', implementer_dept_ids: ['D1'], is_completed: false },
    { id: 'I2', text: 'Two', weightId: 'L', implementer_dept_ids: ['D1', 'D2'], is_completed: true, color: 'GREEN' },
  ],
};

describe('capacity calculator', () => {
  it('sums every task regardless of completion and resolves size boundaries', () => {
    expect(getInitiativeWeight(card.checklist, weights)).toBe(8);
    expect(getInitiativeSize(8, [{ id: 'L', name: 'Large', min_score: 8, max_score: 10, is_active: true }])).toBe('Large');
    expect(getInitiativeSize(7.99, [{ id: 'L', name: 'Large', min_score: 8, max_score: 10, is_active: true }])).toBe('Не визначено');
  });

  it('splits executor load and applies the involved-department formula', () => {
    const loads = calculateCardDepartmentLoads(card, weights);
    expect(loads.get('D1')).toBe(5.5);
    expect(loads.get('D2')).toBe(2.5);
    expect(loads.get('D3')).toBe(2);
    expect(loads.get('D4')).toBe(2);
  });

  it('requires an active weight and at least one executor', () => {
    expect(validateChecklistAssignments([{ id: 'I', text: 'Invalid', is_completed: false }], weights)).toHaveLength(2);
  });

  it('uses the stored weight snapshot even after a definition changes or is deleted', () => {
    const archivedItem = { id: 'I', text: 'Archived', is_completed: false, weightId: 'L', weightSnapshot: { definitionId: 'L', name: 'L', value: 5 }, implementer_dept_ids: ['D1'] };
    expect(getInitiativeWeight([archivedItem], [{ id: 'L', name: 'L', weight: 99, is_active: true }])).toBe(5);
    expect(getInitiativeWeight([archivedItem], [])).toBe(5);
    expect(validateChecklistAssignments([archivedItem], [])).toEqual([]);
  });

  it('shows the stored snapshot in the selector when its dictionary definition changed', () => {
    const item = { id: 'I', text: 'Saved', is_completed: false, weightId: 'L', weightSnapshot: { definitionId: 'L', name: 'Стара назва', value: 5 } };
    expect(getTaskWeightOptionLabel(item, { id: 'L', name: 'Нова назва', weight: 99, is_active: true })).toBe('Стара назва (5)');
    expect(getTaskWeightOptionLabel(item, { id: 'S', name: 'Інша вага', weight: 3, is_active: true })).toBe('Інша вага (3)');
  });
});
