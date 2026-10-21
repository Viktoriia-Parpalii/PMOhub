import { DateTime } from 'luxon';
import { isPeriodLocked } from './period.policy';

describe('archive grace period', () => {
  it('keeps a finished quarter editable through day 14', () => {
    expect(isPeriodLocked(2026, 'Q1', 'Europe/Kyiv', DateTime.fromISO('2026-04-14T23:59:59', { zone: 'Europe/Kyiv' }))).toBe(false);
  });
  it('locks it at midnight on day 15', () => {
    expect(isPeriodLocked(2026, 'Q1', 'Europe/Kyiv', DateTime.fromISO('2026-04-15T00:00:00', { zone: 'Europe/Kyiv' }))).toBe(true);
  });
});
