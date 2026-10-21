import { describe, expect, it, vi } from "vitest";
import { InitiativeQueryService } from "./initiative-query.service";
import { backlogCardSummaryInclude } from "../infrastructure/initiative.mapper";

describe("InitiativeQueryService backlog summaries", () => {
  it("returns case-insensitive ranked relation candidates with existing relation metadata", async () => {
    const queryRaw = vi.fn(async () => [{ id: "initiative-exact" }, { id: "initiative-partial" }]);
    const findMany = vi.fn(async () => [
      {
        id: "initiative-partial",
        kind: "PROJECT",
        name: "План модернізації",
        years: [{ year: 2027 }],
        relationsAsLeft: [],
        relationsAsRight: [],
      },
      {
        id: "initiative-exact",
        kind: "OPERATIONAL_TASK",
        name: "План",
        years: [{ year: 2028 }, { year: 2026 }],
        relationsAsLeft: [
          { id: "relation-1", revision: 2, rightInitiativeId: "current" },
        ],
        relationsAsRight: [],
      },
    ]);
    const service = new InitiativeQueryService({
      $queryRaw: queryRaw,
      initiative: { findMany },
    } as never);

    const result = await service.relationCandidates({
      query: "пЛаН",
      exclude_initiative_id: "current",
      limit: 20,
    });

    expect(queryRaw).toHaveBeenCalledOnce();
    expect(result.data).toEqual([
      {
        initiative_id: "initiative-exact",
        kind: "OPERATIONAL_TASK",
        name: "План",
        available_years: [2028, 2026],
        relation_id: "relation-1",
        relation_revision: 2,
      },
      {
        initiative_id: "initiative-partial",
        kind: "PROJECT",
        name: "План модернізації",
        available_years: [2027],
        relation_id: null,
        relation_revision: null,
      },
    ]);
  });

  it("returns only distinct backlog years in ascending order", async () => {
    const findMany = vi.fn(async () => [
      { year: 2022 },
      { year: 2024 },
      { year: 2026 },
    ]);
    const service = new InitiativeQueryService({
      initiativeYear: { findMany },
    } as never);

    const result = await service.availableYears();

    expect(result.data).toEqual([2022, 2024, 2026]);
    expect(findMany).toHaveBeenCalledWith({
      select: { year: true },
      distinct: ["year"],
      orderBy: { year: "asc" },
    });
  });

  it("combines every portfolio filter in one database query", async () => {
    const findMany = vi.fn(async (_query: unknown) => []);
    const service = new InitiativeQueryService({
      quarterCard: { findMany },
    } as never);

    await service.listCards({
      kind: "PROJECT",
      year: 2026,
      quarter: "Q2",
      name: "  запуск  ",
      strategic_goal: "  ефективність ",
      manager_id: "manager-1",
      priority_id: "priority-1",
      status_id: "status-1",
    });

    expect(findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          AND: undefined,
          quarter: 2,
          managerId: "manager-1",
          priorityId: "priority-1",
          statusId: "status-1",
          initiativeYear: {
            year: 2026,
            strategicGoal: { contains: "ефективність" },
            initiative: {
              kind: "PROJECT",
              name: { contains: "запуск" },
            },
          },
        },
        orderBy: [
          { initiativeYear: { year: "desc" } },
          { quarter: "asc" },
          { createdAt: "desc" },
          { id: "asc" },
        ],
      }),
    );
  });

  it.each([
    ["EXECUTOR", { scopeItems: { some: { executors: { some: { departmentId: "department-1" } } } } }],
    ["INVOLVED", {
      AND: [
        { departments: { some: { departmentId: "department-1" } } },
        { scopeItems: { none: { executors: { some: { departmentId: "department-1" } } } } },
      ],
    }],
  ] as const)("filters portfolio by %s department relation", async (department_relation, expected) => {
    const findMany = vi.fn(async (_query: unknown) => []);
    const service = new InitiativeQueryService({ quarterCard: { findMany } } as never);

    await service.listCards({
      kind: "PROJECT",
      year: 2026,
      quarter: "Q2",
      department_id: "department-1",
      department_relation,
    });

    expect(findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ AND: [expected] }),
      }),
    );
  });

  it("uses executor OR involved semantics for portfolio ANY", async () => {
    const findMany = vi.fn(async (_query: unknown) => []);
    const service = new InitiativeQueryService({ quarterCard: { findMany } } as never);

    await service.listCards({ department_id: "department-1" });

    const where = (findMany.mock.calls[0]?.[0] as { where: any }).where;
    expect(where.AND[0].OR).toHaveLength(2);
  });

  it("matches backlog card dimensions on one card and keeps preparation fallback", async () => {
    const findMany = vi.fn(async (_query: unknown) => []);
    const service = new InitiativeQueryService({
      initiativeYear: { findMany },
    } as never);

    await service.listYears({
      kind: "PROJECT",
      year: 2026,
      quarter: "Q3",
      manager_id: "manager-1",
      priority_id: "priority-1",
    });
    const quarterQuery = findMany.mock.calls[0]?.[0] as {
      where: { OR: unknown };
    };
    expect(quarterQuery.where.OR).toEqual([
      {
        quarterCards: {
          some: {
            quarter: 3,
            managerId: "manager-1",
            priorityId: "priority-1",
          },
        },
      },
    ]);

    await service.listYears({
      kind: "PROJECT",
      year: 2026,
      manager_id: "manager-1",
      priority_id: "priority-1",
    });
    const allQuartersQuery = findMany.mock.calls[1]?.[0] as {
      where: { OR: unknown };
    };
    expect(allQuartersQuery.where.OR).toEqual([
      {
        quarterCards: {
          some: {
            quarter: undefined,
            managerId: "manager-1",
            priorityId: "priority-1",
          },
        },
      },
      {
        quarterCards: { none: {} },
        preparationStage: {
          is: { managerId: "manager-1", priorityId: "priority-1" },
        },
      },
    ]);
  });

  it("returns filtered and total backlog counts for both kinds", async () => {
    const count = vi
      .fn()
      .mockResolvedValueOnce(4)
      .mockResolvedValueOnce(10)
      .mockResolvedValueOnce(2)
      .mockResolvedValueOnce(8);
    const service = new InitiativeQueryService({
      initiativeYear: { count },
    } as never);

    const result = await service.countYears({
      year: 2026,
      name: "план",
    });

    expect(result.data).toEqual({
      projects: { filtered: 4, total: 10 },
      operational_tasks: { filtered: 2, total: 8 },
    });
    expect(count).toHaveBeenCalledTimes(4);
  });

  it("filters backlog by a department in any card without preparation fallback", async () => {
    const findMany = vi.fn(async (_query: unknown) => []);
    const service = new InitiativeQueryService({ initiativeYear: { findMany } } as never);

    await service.listYears({
      kind: "PROJECT",
      year: 2026,
      department_id: "department-1",
    });

    const where = (findMany.mock.calls[0]?.[0] as { where: any }).where;
    expect(where.OR).toEqual([
      {
        quarterCards: {
          some: expect.objectContaining({
            AND: [expect.objectContaining({ OR: expect.any(Array) })],
          }),
        },
      },
    ]);
  });

  it("returns aggregates without scope text or custom fields", async () => {
    const prisma = {
      quarterCard: {
        findMany: vi.fn(async () => [
          {
            id: "card-1",
            initiativeYearId: "year-1",
            initiativeYear: {
              initiativeId: "initiative-1",
              year: 2026,
              initiative: { kind: "PROJECT", name: "Initiative" },
            },
            quarter: 2,
            managerId: "manager-1",
            priorityId: "priority-1",
            statusId: "status-1",
            status: {
              id: "status-1",
              code: "ACTIVE",
              name: "Active",
              color: "#00aa00",
            },
            departments: [
              { departmentId: "involved" },
              { departmentId: "executor" },
            ],
            scopeItems: [
              {
                statusCode: "GREEN",
                executors: [{ departmentId: "executor" }],
              },
              { statusCode: "YELLOW", executors: [] },
            ],
            totalWeight: { toNumber: () => 12.5 },
            revision: 3,
          },
        ]),
      },
    };

    const result = await new InitiativeQueryService(
      prisma as never,
    ).listBacklogCardSummaries("year-1", {
      manager_id: "manager-1",
      priority_id: "priority-1",
      department_id: "executor",
    });

    expect(prisma.quarterCard.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          initiativeYearId: "year-1",
          managerId: "manager-1",
          priorityId: "priority-1",
        },
        include: backlogCardSummaryInclude,
      }),
    );
    expect(result.data[0]).toMatchObject({
      id: "card-1",
      quarter: "Q2",
      scope_total: 2,
      scope_completed: 1,
      scope_in_progress: 1,
      effective_involved_department_ids: ["involved"],
      matches_department_filter: true,
    });
    expect(result.data[0]).not.toHaveProperty("scope");
    expect(result.data[0]).not.toHaveProperty("custom_fields");
    expect(result.data[0]).not.toHaveProperty("notes");
  });
});
