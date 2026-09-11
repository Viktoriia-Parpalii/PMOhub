import { describe, expect, it } from "vitest";
import {
  capacityPeriodKey,
  resolveDepartmentCapacityLimits,
} from "./department-capacity-history";

const decimal = (value: number) => ({ toNumber: () => value });

describe("resolveDepartmentCapacityLimits", () => {
  it("uses the latest change in a quarter and carries it into later quarters", () => {
    const rows = [
      { departmentId: "d", limitPoints: decimal(10), effectiveYear: 2026, effectiveQuarter: 1, changedAt: new Date("2026-01-10Z") },
      { departmentId: "d", limitPoints: decimal(12), effectiveYear: 2026, effectiveQuarter: 1, changedAt: new Date("2026-02-10Z") },
      { departmentId: "d", limitPoints: decimal(20), effectiveYear: 2026, effectiveQuarter: 3, changedAt: new Date("2026-08-10Z") },
    ];
    const periods = [
      { year: 2025, quarter: 4 },
      { year: 2026, quarter: 1 },
      { year: 2026, quarter: 2 },
      { year: 2026, quarter: 3 },
      { year: 2027, quarter: 1 },
    ];
    const result = resolveDepartmentCapacityLimits(["d"], periods, rows);
    expect(periods.map((period) => result.get(capacityPeriodKey("d", period)))).toEqual([
      0,
      12,
      12,
      20,
      20,
    ]);
  });
});
