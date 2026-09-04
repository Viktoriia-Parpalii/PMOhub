import { describe, expect, it, vi } from "vitest";
import { InitiativeQueryService } from "./initiative-query.service";
import { backlogCardSummaryInclude } from "../infrastructure/initiative.mapper";

describe("InitiativeQueryService backlog summaries", () => {
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
              { statusCode: "DEFAULT", executors: [] },
            ],
            totalWeight: { toNumber: () => 12.5 },
            revision: 3,
          },
        ]),
      },
    };

    const result = await new InitiativeQueryService(
      prisma as never,
    ).listBacklogCardSummaries("year-1");

    expect(prisma.quarterCard.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { initiativeYearId: "year-1" },
        include: backlogCardSummaryInclude,
      }),
    );
    expect(result.data[0]).toMatchObject({
      id: "card-1",
      quarter: "Q2",
      scope_total: 2,
      scope_completed: 1,
      effective_involved_department_ids: ["involved"],
    });
    expect(result.data[0]).not.toHaveProperty("scope");
    expect(result.data[0]).not.toHaveProperty("custom_fields");
    expect(result.data[0]).not.toHaveProperty("notes");
  });
});
