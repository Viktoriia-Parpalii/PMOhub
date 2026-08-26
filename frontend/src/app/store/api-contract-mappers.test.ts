import { afterEach, describe, expect, it, vi } from "vitest";
import { toChecklistDto, toPassportDto } from "./api-contract-mappers";
import { serverCommands } from "./server-commands";

const UUID = "00000000-0000-4000-8000-000000000001";

describe("strict API contract mapping", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("keeps only PassportDto fields from a full initiative read model", () => {
    const passport = toPassportDto({
      id: "frontend-id",
      name: "  Initiative  ",
      strategic_goal: "Goal",
      manager_id: UUID,
      priority: "legacy-priority",
      implementer_dept_ids: [UUID, "legacy-department"],
      cross_functional_dept_ids: [],
      history: [{ id: "history", date: "2026-01-01", author: "A", action: "B" }],
      revision: 3,
      checklist: [],
    } as any);

    expect(passport).toEqual({
      name: "Initiative",
      strategic_goal: "Goal",
      manager_id: UUID,
      implementer_dept_ids: [UUID],
      cross_functional_dept_ids: [],
    });
    expect(passport).not.toHaveProperty("id");
    expect(passport).not.toHaveProperty("history");
    expect(passport).not.toHaveProperty("revision");
    expect(passport).not.toHaveProperty("checklist");
  });

  it("omits temporary checklist IDs and read-only metadata", () => {
    const [item] = toChecklistDto([{
      id: "SCOPE-local-id",
      text: "Task",
      is_completed: false,
      color: "DEFAULT",
      implementer_dept_ids: [UUID, "legacy-department"],
      moved_from: "Q1 2026",
      history: [],
    } as any]);

    expect(item).toEqual({
      text: "Task",
      is_completed: false,
      color: "DEFAULT",
      implementer_dept_ids: [UUID],
    });
  });

  it("preserves canonical UUIDs needed by checklist diff", () => {
    expect(toChecklistDto([{
      id: UUID,
      text: "Existing task",
      is_completed: true,
      weightId: UUID,
      assigneeIds: [UUID],
      implementer_dept_ids: [UUID],
    }])).toEqual([{
      id: UUID,
      text: "Existing task",
      is_completed: true,
      weightId: UUID,
      assigneeIds: [UUID],
      implementer_dept_ids: [UUID],
    }]);
  });

  it("sanitizes updateCard again at the HTTP command boundary", async () => {
    const fetchMock = vi.fn(async (_input: RequestInfo | URL, _init?: RequestInit) =>
      new Response(JSON.stringify({ success: true, message: "ok" }), {
        status: 200,
        headers: { "content-type": "application/json" },
      }),
    );
    vi.stubGlobal("fetch", fetchMock);

    await serverCommands.updateCard("card-id", {
      revision: 4,
      health_status: "DEFAULT",
      passport: {
        id: "frontend-id",
        name: "Card",
        implementer_dept_ids: [],
        cross_functional_dept_ids: [],
        history: [],
      },
      checklist: [{
        id: "SCOPE-local-id",
        text: "Task",
        implementer_dept_ids: [],
        history: [],
      }],
    } as any);

    const request = fetchMock.mock.calls[0][1];
    expect(JSON.parse(String(request?.body))).toEqual({
      revision: 4,
      passport: {
        name: "Card",
        implementer_dept_ids: [],
        cross_functional_dept_ids: [],
      },
      checklist: [{ text: "Task", implementer_dept_ids: [] }],
    });
  });
});
