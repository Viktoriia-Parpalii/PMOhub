import { describe, expect, it } from 'vitest';
import { Project } from '../types';
import { pickPassportPatch } from './sync';

describe('passport synchronization', () => {
  it('only copies passport fields and excludes scope, status, period and history', () => {
    const source: Project = {
      id: 'P1', name: 'Updated', strategic_goal: 'Grow\nworldwide', manager_id: 'M1', priority: 'HIGH',
      implementer_dept_ids: ['D1'], cross_functional_dept_ids: ['D2'], custom_fields: { note: 'x' },
      year: 2026, quarter: 'Q3', health_status: 'RED', is_backlog: false,
      checklist: [{ id: 'I1', text: 'Scope', is_completed: false, weightId: 'W1', implementer_dept_ids: ['D1'] }],
      history: [{ id: 'H1', date: '2026-01-01', author: 'A', action: 'Changed' }],
    };

    expect(pickPassportPatch(source)).toEqual({
      name: 'Updated', manager_id: 'M1', priority: 'HIGH', strategic_goal: 'Grow\nworldwide',
      implementer_dept_ids: ['D1'], cross_functional_dept_ids: ['D2'], custom_fields: { note: 'x' },
    });
  });
});
