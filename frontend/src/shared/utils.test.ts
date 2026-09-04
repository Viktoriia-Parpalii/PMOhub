import { describe, expect, it } from 'vitest';
import {
  getHistoricalAndPlanningYears,
  getValidYears,
  isBacklogLocked,
  isPeriodLocked,
  isPeriodLockedAtBusinessDate,
} from './utils';

describe('year filter options', () => {
  it('combines every historical data year with the current and next three years', () => {
    expect(
      getHistoricalAndPlanningYears([2021, 2024, 2026, 2028, 2035], 2026),
    ).toEqual([2021, 2024, 2026, 2027, 2028, 2029]);
  });

  it('allows a future card to select the current year as a transfer target', () => {
    expect(getValidYears(2028, 2026)).toContain(2026);
  });
});

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

  it('uses the backend business date instead of the browser timezone', () => {
    expect(isPeriodLockedAtBusinessDate(2026, 'Q1', '2026-04-14')).toBe(false);
    expect(isPeriodLockedAtBusinessDate(2026, 'Q1', '2026-04-15')).toBe(true);
  });
});
