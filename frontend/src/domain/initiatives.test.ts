import { describe, expect, it } from 'vitest';
import { commitScopeMerge, continueCard, deleteInitiative, materializeBacklogYear, moveCard, moveChecklistItem } from './initiatives';
import { Project } from '../types';

const currentYear = new Date().getFullYear();
const passport = { name: 'Master', strategic_goal: 'Current\nstrategy', implementer_dept_ids: ['D1'], cross_functional_dept_ids: [] as string[] };
const records = (completed = false, withTarget = false): Project[] => {
  const base: Project[] = [
    { id: 'B', ...passport, year: currentYear, quarter: 'Q1', health_status: 'DEFAULT', checklist: [], is_backlog: true, history: [], yearSnapshots: {
      [String(currentYear - 1)]: { ...passport, name: 'Historical master', strategic_goal: 'Old strategy', year: currentYear - 1, history: [] },
      [String(currentYear)]: { ...passport, year: currentYear, history: [] },
    } },
    { id: 'C', backlog_id: 'B', ...passport, year: currentYear, quarter: 'Q3', health_status: 'YELLOW', is_backlog: false, checklist: [{ id: 'I', text: 'Scope', weightId: 'W', implementer_dept_ids: ['D1'], is_completed: completed, color: completed ? 'GREEN' : 'DEFAULT' }] },
  ];
  if (withTarget) base.push({ id: 'TARGET', backlog_id: 'B', ...passport, year: currentYear + 1, quarter: 'Q1', health_status: 'YELLOW', is_backlog: false, checklist: [{ id: 'EXISTING', text: 'Existing', weightId: 'W', implementer_dept_ids: ['D1'], is_completed: false }] });
  return base;
};

describe('initiative commands', () => {
  it('keeps historical snapshots independent', () => {
    expect(materializeBacklogYear(records()[0], currentYear - 1)).toMatchObject({ name: 'Historical master', strategic_goal: 'Old strategy' });
    expect(materializeBacklogYear(records()[0], currentYear)).toMatchObject({ name: 'Master', strategic_goal: 'Current\nstrategy' });
  });

  it('blocks moving and deleting a card with completed scope', () => {
    expect(moveCard(records(true), { cardId: 'C', toYear: currentYear, toQuarter: 'Q4', author: 'Admin' }).success).toBe(false);
    expect(deleteInitiative(records(true), 'C').success).toBe(false);
  });

  it('moves in place and creates a missing future snapshot from the current year', () => {
    const result = moveCard(records(), { cardId: 'C', toYear: currentYear + 1, toQuarter: 'Q1', author: 'Admin' });
    expect(result.success).toBe(true);
    expect(result.data?.find(item => item.id === 'C')).toMatchObject({ year: currentYear + 1, quarter: 'Q1', health_status: 'DEFAULT', strategic_goal: 'Current\nstrategy' });
    expect(result.data?.find(item => item.id === 'B')?.yearSnapshots?.[String(currentYear - 1)]?.name).toBe('Historical master');
  });

  it('blocks moving a whole card into an occupied target period', () => {
    const first = moveCard(records(false, true), { cardId: 'C', toYear: currentYear + 1, toQuarter: 'Q1', author: 'Admin' });
    expect(first.success).toBe(false); expect(first.requiresConfirmation).toBeUndefined();
    expect(first.message).toContain('Повне перенесення неможливе');
  });

  it('continues a card without moving the source or copying its scope', () => {
    const result = continueCard(records(), { cardId: 'C', toYear: currentYear + 1, toQuarter: 'Q1', author: 'Admin', newCardId: 'CONTINUED' });
    expect(result.success).toBe(true);
    expect(result.data?.find(item => item.id === 'C')).toMatchObject({ year: currentYear, quarter: 'Q3', checklist: [{ id: 'I' }] });
    expect(result.data?.find(item => item.id === 'CONTINUED')).toMatchObject({ backlog_id: 'B-Y' + (currentYear + 1), year: currentYear + 1, quarter: 'Q1', health_status: 'DEFAULT', checklist: [] });
    expect(result.data?.some(item => item.is_backlog && item.year === currentYear + 1)).toBe(true);
  });

  it('blocks continuation into an occupied target period', () => {
    const result = continueCard(records(false, true), { cardId: 'C', toYear: currentYear + 1, toQuarter: 'Q1', author: 'Admin', newCardId: 'CONTINUED' });
    expect(result.success).toBe(false);
    expect(result.message).toContain('Продовження неможливе');
  });

  it('rejects a stale merge preview', () => {
    const initial = records(false, true); const preview = moveChecklistItem(initial, { cardId: 'C', itemId: 'I', toYear: currentYear + 1, toQuarter: 'Q1', author: 'Admin', newCardId: 'NEW' }).requiresConfirmation!;
    const changed = initial.map(item => item.id === 'TARGET' ? { ...item, checklist: [...item.checklist, { id: 'NEW', text: 'Changed', is_completed: false }] } : item);
    expect(commitScopeMerge(changed, { preview, author: 'Admin' }).success).toBe(false);
  });

  it('requires confirmation when an item is moved into existing scope', () => {
    const first = moveChecklistItem(records(false, true), { cardId: 'C', itemId: 'I', toYear: currentYear + 1, toQuarter: 'Q1', author: 'Admin', newCardId: 'NEW' });
    expect(first.requiresConfirmation).toBeDefined();
  });
});
