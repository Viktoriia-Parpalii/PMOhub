import { DateTime } from 'luxon';
import { Quarter } from './types';

export const quarterNumber = (quarter: Quarter) => Number(quarter.slice(1));

export const currentPeriod = (zone = 'Europe/Kyiv', now = DateTime.now().setZone(zone)): { year: number; quarter: Quarter } => ({
  year: now.year,
  quarter: `Q${Math.floor((now.month - 1) / 3) + 1}` as Quarter,
});

/** A quarter becomes archived at 00:00 on the 15th day of the next quarter in business time. */
export const isPeriodLocked = (year: number, quarter: Quarter, zone = 'Europe/Kyiv', now = DateTime.now().setZone(zone)): boolean => {
  const q = quarterNumber(quarter);
  const nextQuarterMonth = q === 4 ? 1 : q * 3 + 1;
  const nextQuarterYear = q === 4 ? year + 1 : year;
  const lockAt = DateTime.fromObject({ year: nextQuarterYear, month: nextQuarterMonth, day: 15 }, { zone }).startOf('day');
  return now >= lockAt;
};

export const isBacklogLocked = (year: number, zone = 'Europe/Kyiv', now = DateTime.now().setZone(zone)) => isPeriodLocked(year, 'Q4', zone, now);

export const isFuturePeriod = (sourceYear: number, sourceQuarter: Quarter, targetYear: number, targetQuarter: Quarter) =>
  targetYear * 10 + quarterNumber(targetQuarter) > sourceYear * 10 + quarterNumber(sourceQuarter);
