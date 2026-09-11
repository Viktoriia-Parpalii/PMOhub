import { validate } from "class-validator";
import { describe, expect, it } from "vitest";
import { AnalyticsFilterDto } from "./analytics.dto";

describe("analytics filter identifiers", () => {
  it("accepts deterministic UUID v4 identifiers from the quality seed", async () => {
    const dto = Object.assign(new AnalyticsFilterDto(), {
      year: 2026,
      department_id: "10000000-0000-4000-8000-000000000008",
      manager_id: "20000000-0000-4000-8000-000000000001",
    });

    expect(await validate(dto)).toEqual([]);
  });

  it("rejects identifiers that only match the SQL GUID shape", async () => {
    const dto = Object.assign(new AnalyticsFilterDto(), {
      year: 2026,
      department_id: "10000000-0000-0000-0000-000000000008",
    });

    expect(await validate(dto)).toEqual([
      expect.objectContaining({ property: "department_id" }),
    ]);
  });
});
