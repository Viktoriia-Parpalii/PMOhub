import { describe, expect, it } from "vitest";
import { ExportSummaryService } from "./export-summary.service";

const decimal = (value: number) => ({ toNumber: () => value });

describe("ExportSummaryService historical capacity", () => {
  it("sums capacity only for the selected quarter periods", () => {
    const dataset = {
      years: [],
      customFields: [],
      departments: [{ id: "d", name: "IT", capacityLimitPoints: decimal(999) }],
      departmentCapacityHistory: [
        { departmentId: "d", limitPoints: decimal(10), effectiveYear: 2026, effectiveQuarter: 1, changedAt: new Date("2026-01-01Z") },
        { departmentId: "d", limitPoints: decimal(20), effectiveYear: 2026, effectiveQuarter: 3, changedAt: new Date("2026-07-01Z") },
      ],
      cards: [
        {
          quarter: 2,
          initiativeYear: { year: 2026, initiative: { kind: "PROJECT" } },
          manager: null,
          priority: null,
          status: { name: "Активно" },
          sizeSnapshotName: "M",
          totalWeight: decimal(1),
          departments: [],
          scopeItems: [
            { statusCode: "GREEN", weightSnapshotValue: decimal(1), executors: [{ departmentId: "d" }] },
          ],
        },
      ],
    };
    const summary = new ExportSummaryService().build(dataset as never, {
      years: { from: 2026, to: 2026 },
      periods: ["BACKLOG", "Q2", "Q4"],
      kinds: ["PROJECT"],
    });
    expect(summary.department_load[0]).toMatchObject({ load: 1, limit: 30 });
  });
});
