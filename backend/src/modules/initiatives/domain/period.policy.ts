import { DateTime } from "luxon";
export type Quarter = "Q1" | "Q2" | "Q3" | "Q4";

export const quarterNumber = (quarter: Quarter) => Number(quarter.slice(1));

export const currentPeriod = (
  zone = "Europe/Kyiv",
  now = DateTime.now().setZone(zone),
): { year: number; quarter: Quarter } => ({
  year: now.year,
  quarter: `Q${Math.floor((now.month - 1) / 3) + 1}` as Quarter,
});

export const periodLockAt = (
  year: number,
  quarter: Quarter,
  zone = "Europe/Kyiv",
): DateTime => {
  const q = quarterNumber(quarter);
  return DateTime.fromObject(
    {
      year: q === 4 ? year + 1 : year,
      month: q === 4 ? 1 : q * 3 + 1,
      day: 15,
    },
    { zone },
  ).startOf("day");
};

/** A quarter becomes archived at 00:00 on the 15th day of the next quarter in business time. */
export const isPeriodLocked = (
  year: number,
  quarter: Quarter,
  zone = "Europe/Kyiv",
  now = DateTime.now().setZone(zone),
): boolean => {
  return now >= periodLockAt(year, quarter, zone);
};

export const isBacklogLocked = (
  year: number,
  zone = "Europe/Kyiv",
  now = DateTime.now().setZone(zone),
) => isPeriodLocked(year, "Q4", zone, now);

export const isFuturePeriod = (
  sourceYear: number,
  sourceQuarter: Quarter,
  targetYear: number,
  targetQuarter: Quarter,
) =>
  targetYear * 10 + quarterNumber(targetQuarter) >
  sourceYear * 10 + quarterNumber(sourceQuarter);
