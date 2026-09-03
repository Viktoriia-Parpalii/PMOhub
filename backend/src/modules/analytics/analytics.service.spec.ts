import { describe, expect, it, vi } from "vitest";
import { AnalyticsService } from "./analytics.service";

const decimal = (value: number) => ({ toNumber: () => value });
const overviewCard = (
  quarter: number,
  status: string,
  id = `card-${quarter}`,
  scopeStatus = "YELLOW",
) => ({
  id,
  quarter,
  statusId: `status-${status}`,
  priorityId: "priority",
  sizeSnapshotName: "M",
  priority: { name: "Priority" },
  status: { name: `Status ${status}`, color: "#123456" },
  initiativeYear: { initiativeId: "initiative" },
  scopeItems: [{ statusCode: scopeStatus }],
});

const recordCard = (id: string) => ({
  id,
  quarter: 2,
  managerId: "manager",
  priorityId: "priority",
  statusId: "status-risk",
  totalWeight: decimal(4),
  sizeSnapshotName: "M",
  manager: { name: "Manager" },
  priority: { name: "Priority" },
  status: { name: "Risk", color: "#123456" },
  departments: [{ departmentId: "department" }],
  initiativeYear: {
    year: 2027,
    initiativeId: "initiative",
    initiative: { kind: "PROJECT", name: "Project" },
  },
  scopeItems: [
    { statusCode: "YELLOW", executors: [{ departmentId: "department" }] },
  ],
});

describe("AnalyticsService section contracts", () => {
  it("returns a compact quarterly overview without card id collections", async () => {
    const prisma: any = {
      quarterCard: { findMany: vi.fn(async () => [overviewCard(2, "ACTIVE")]) },
      initiativeYear: { findMany: vi.fn(async () => [{ year: 2027 }]) },
    };
    const result = await new AnalyticsService(prisma).quarterlyOverview({
      year: 2027,
      quarter: "Q2",
      kind: "PROJECT",
      department_id: "department",
      manager_id: "manager",
    });
    expect(prisma.quarterCard.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          quarter: 2,
          managerId: "manager",
          departments: { some: { departmentId: "department" } },
          initiativeYear: { year: 2027, initiative: { kind: "PROJECT" } },
        },
      }),
    );
    expect(result.summary).toMatchObject({ cards: 1, scope_items: 1 });
    expect(result.status_distribution[0]).toEqual({
      status_id: "status-ACTIVE",
      name: "Status ACTIVE",
      color: "#123456",
      count: 1,
    });
    expect(JSON.stringify(result)).not.toContain("card_ids");
  });

  it("returns normalized annual workload without manager card ids", async () => {
    const cards = [
      {
        id: "card-1",
        quarter: 1,
        managerId: "manager",
        totalWeight: decimal(4),
        manager: { name: "Manager" },
        departments: [{ departmentId: "department" }],
        scopeItems: [
          {
            weightSnapshotValue: decimal(4),
            executors: [{ departmentId: "department" }],
          },
        ],
      },
    ];
    const prisma: any = {
      quarterCard: { findMany: vi.fn(async () => cards) },
      department: {
        findMany: vi.fn(async () => [
          { id: "department", name: "Department", capacityLimitPoints: decimal(10) },
        ]),
      },
    };
    const result = await new AnalyticsService(prisma).annualWorkload({ year: 2027 });
    expect(result.departments[0]).toMatchObject({ load: 4, limit: 40, reserve: 36 });
    expect(result.departments[0].quarters).toHaveLength(4);
    expect(result.managers[0]).toEqual({
      manager_id: "manager",
      name: "Manager",
      load: 4,
      cards: 1,
    });
    expect(JSON.stringify(result)).not.toContain("card_ids");
  });

  it("calculates quarterly comparison with count-only database queries", async () => {
    const prisma: any = {
      quarterCard: { count: vi.fn().mockResolvedValueOnce(8).mockResolvedValueOnce(6) },
    };
    const result = await new AnalyticsService(prisma).quarterlyTrends({
      year: 2027,
      quarter: "Q1",
    });
    expect(result.period_comparison).toEqual([
      { label: "Q4 2026", cards: 6 },
      { label: "Q1 2027", cards: 8 },
    ]);
  });

  it("paginates drilldown in the database and filters by dimensions", async () => {
    const prisma: any = {
      quarterCard: {
        count: vi.fn(async () => 1),
        findMany: vi.fn(async () => [recordCard("card-1")]),
      },
    };
    const result = await new AnalyticsService(prisma).drilldown({
      year: 2027,
      mode: "annual",
      status_id: "status-risk",
      size_name: "M",
      priority_key: "priority",
      page: 2,
      page_size: 25,
    });
    expect(prisma.quarterCard.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        skip: 25,
        take: 25,
        where: expect.objectContaining({
          statusId: "status-risk",
          sizeSnapshotName: "M",
          priorityId: "priority",
        }),
      }),
    );
    expect(result).toMatchObject({ total: 1, page: 2, page_size: 25 });
    expect(result.records[0]).not.toHaveProperty("status_code");
  });
});
