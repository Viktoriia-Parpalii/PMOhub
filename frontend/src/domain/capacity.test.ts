import { describe, expect, it } from 'vitest';
import { calculateCardDepartmentLoads, getInitiativeSize, getInitiativeWeight, validateChecklistCapacity } from './capacity';
import { Department, Project, TaskWeightDef } from '../types';

const weights: TaskWeightDef[] = [
  { id: 'S', name: 'S', weight: 3, is_active: true },
  { id: 'L', name: 'L', weight: 5, is_active: true },
];
const card: Project = {
  id: 'C1', backlog_id: 'B1', name: 'Card', strategic_goal: 'Goal', manager_id: 'M1', priority: 'High',
  implementer_dept_ids: ['D1', 'D2'], cross_functional_dept_ids: ['D3', 'D4'], year: 2026, quarter: 'Q3',
  health_status: 'DEFAULT', is_backlog: false, checklist: [
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
    expect(validateChecklistCapacity([{ id: 'I', text: 'Invalid', is_completed: false }], weights)).toHaveLength(2);
  });
});
