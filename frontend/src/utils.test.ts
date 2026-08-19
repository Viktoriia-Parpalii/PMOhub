import { describe, expect, it } from 'vitest';
import { isBacklogLocked, isPeriodLocked } from './utils';

describe('archive grace period', () => {
  it('keeps a finished quarter editable through the 14th day of the next quarter', () => {
    expect(isPeriodLocked(2026, 'Q1', new Date(2026, 3, 14, 23, 59, 59))).toBe(false);
  });

  it('archives a finished quarter from the 15th day of the next quarter', () => {
    expect(isPeriodLocked(2026, 'Q1', new Date(2026, 3, 15, 0, 0, 0))).toBe(true);
  });

  it('uses the same grace period for the previous yearly backlog snapshot', () => {
    expect(isBacklogLocked(2025, new Date(2026, 0, 14, 12, 0, 0))).toBe(false);
    expect(isBacklogLocked(2025, new Date(2026, 0, 15, 0, 0, 0))).toBe(true);
  });
});
