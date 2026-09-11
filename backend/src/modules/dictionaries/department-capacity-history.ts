import { Prisma } from "../../generated/prisma/client";

export interface CapacityPeriod {
  year: number;
  quarter: number;
}

export interface CapacityHistoryRow {
  departmentId: string;
  limitPoints: Prisma.Decimal | { toNumber(): number };
  effectiveYear: number;
  effectiveQuarter: number;
  changedAt: Date;
}

const ordinal = ({ year, quarter }: CapacityPeriod) => year * 4 + quarter;
export const capacityPeriodKey = (departmentId: string, period: CapacityPeriod) =>
  `${departmentId}:${period.year}:Q${period.quarter}`;

/** Resolves all requested periods in one ordered pass, carrying the last known limit forward. */
export const resolveDepartmentCapacityLimits = (
  departmentIds: string[],
  periods: CapacityPeriod[],
  rows: CapacityHistoryRow[] = [],
) => {
  const requested = [...new Map(periods.map((period) => [ordinal(period), period])).values()].sort(
    (a, b) => ordinal(a) - ordinal(b),
  );
  const grouped = new Map<string, CapacityHistoryRow[]>();
  rows.forEach((row) => {
    const list = grouped.get(row.departmentId) ?? [];
    list.push(row);
    grouped.set(row.departmentId, list);
  });
  grouped.forEach((list) =>
    list.sort(
      (a, b) =>
        ordinal({ year: a.effectiveYear, quarter: a.effectiveQuarter }) -
          ordinal({ year: b.effectiveYear, quarter: b.effectiveQuarter }) ||
        a.changedAt.getTime() - b.changedAt.getTime(),
    ),
  );

  const result = new Map<string, number>();
  departmentIds.forEach((departmentId) => {
    const history = grouped.get(departmentId) ?? [];
    let index = 0;
    let current = 0;
    requested.forEach((period) => {
      while (
        index < history.length &&
        ordinal({
          year: history[index].effectiveYear,
          quarter: history[index].effectiveQuarter,
        }) <= ordinal(period)
      ) {
        current = history[index].limitPoints.toNumber();
        index += 1;
      }
      result.set(capacityPeriodKey(departmentId, period), current);
    });
  });
  return result;
};
