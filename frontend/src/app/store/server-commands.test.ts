import { afterEach, describe, expect, it, vi } from "vitest";
import { serverCommands } from "./server-commands";
import { loadAnalytics, loadInitiativeYears, loadQuarterCards, loginSession, logoutSession, setAuthFailureHandler } from "../../api/apiClient";

describe("server command routing", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("uses the domain endpoint and never the backup import for a normal edit", async () => {
    const fetchMock = vi.fn(async (_input: RequestInfo | URL, _init?: RequestInit) => new Response(JSON.stringify({ success: true, message: "ok" }), {
      status: 200,
      headers: { "content-type": "application/json" },
    }));
    vi.stubGlobal("fetch", fetchMock);

    await serverCommands.updateCard("card-id", { revision: 1, department_ids: [], status_id: "00000000-0000-4000-8000-000000000001", scope: [] });

    expect(fetchMock).toHaveBeenCalledOnce();
    expect(String(fetchMock.mock.calls[0][0])).toContain("/quarter-cards/card-id");
    expect(String(fetchMock.mock.calls[0][0])).not.toContain("/backups/import");
  });

  it("sends only revision and status for a portfolio status change", async () => {
    const fetchMock = vi.fn(async (_input: RequestInfo | URL, _init?: RequestInit) =>
      new Response(JSON.stringify({ success: true, data: { id: "card-id" } }), {
        status: 200,
        headers: { "content-type": "application/json" },
      }),
    );
    vi.stubGlobal("fetch", fetchMock);

    await serverCommands.updateCardStatus("card-id", 7, "status-id");

    expect(String(fetchMock.mock.calls[0][0])).toContain(
      "/quarter-cards/card-id/status",
    );
    expect(JSON.parse(String(fetchMock.mock.calls[0][1]?.body))).toEqual({
      revision: 7,
      status_id: "status-id",
    });
  });

  it("uses the canonical role-permissions route", async () => {
    const fetchMock = vi.fn(async (_input: RequestInfo | URL, _init?: RequestInit) => new Response(JSON.stringify({ success: true }), { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);
    await serverCommands.updatePermission("ADMIN", { canAccessAdmin: true });
    expect(String(fetchMock.mock.calls[0][0])).toContain("/role-permissions/ADMIN");
  });

  it("uses a dedicated scope copy command without sending client snapshots", async () => {
    const fetchMock = vi.fn(async (_input: RequestInfo | URL, _init?: RequestInit) =>
      new Response(JSON.stringify({ success: true }), { status: 200 }),
    );
    vi.stubGlobal("fetch", fetchMock);
    await serverCommands.copyScope("card-id", "scope-id", 4, 2027, "Q2", 2);
    expect(String(fetchMock.mock.calls[0][0])).toContain("/quarter-cards/card-id/scope/scope-id/copy");
    expect(JSON.parse(String(fetchMock.mock.calls[0][1]?.body))).toEqual({
      revision: 4,
      to_year: 2027,
      to_quarter: "Q2",
      target_revision: 2,
    });
  });

  it("updates backlog name and year goal with one atomic command", async () => {
    const fetchMock = vi.fn(async (_input: RequestInfo | URL, _init?: RequestInit) => new Response(JSON.stringify({ success: true }), { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);

    await serverCommands.updateBacklog("year-id", {
      initiative_revision: 2,
      year_revision: 4,
      name: "Updated",
      strategic_goal: "Goal",
    });

    expect(String(fetchMock.mock.calls[0][0])).toContain("/initiative-years/year-id/backlog");
    expect(fetchMock).toHaveBeenCalledOnce();
  });

  it("creates a backlog record and its initial quarter card with one atomic command", async () => {
    const fetchMock = vi.fn(async (_input: RequestInfo | URL, _init?: RequestInit) => new Response(JSON.stringify({ success: true }), { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);

    await serverCommands.createInitiative({
      kind: "PROJECT",
      name: "Atomic create",
      year: 2027,
      preparation: { department_ids: [] },
      initial_card: {
        quarter: "Q2",
        department_ids: [],
        status_id: "00000000-0000-4000-8000-000000000001",
        custom_fields: { field: "value" },
        scope: [{
          text: "Task",
          status_code: "YELLOW",
          weight_definition_id: "00000000-0000-4000-8000-000000000002",
          executor_department_ids: ["00000000-0000-4000-8000-000000000003"],
        }],
      },
    });

    expect(fetchMock).toHaveBeenCalledOnce();
    const body = JSON.parse(String(fetchMock.mock.calls[0][1]?.body));
    expect(body.initial_card).toMatchObject({ quarter: "Q2", custom_fields: { field: "value" } });
    expect(body.initial_card.scope).toHaveLength(1);
  });

  it("applies year and quarter filters to collection queries", async () => {
    const fetchMock = vi.fn(async (_input: RequestInfo | URL, _init?: RequestInit) => new Response(JSON.stringify({ success: true, data: [] }), { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);

    await loadInitiativeYears("project", undefined, 2027);
    await loadQuarterCards("task", undefined, 2027, "Q3");

    expect(String(fetchMock.mock.calls[0][0])).toContain("kind=PROJECT&year=2027");
    expect(String(fetchMock.mock.calls[1][0])).toContain("kind=OPERATIONAL_TASK&year=2027&quarter=Q3");
  });

  it("covers the login-create-edit-move-delete-logout smoke flow", async () => {
    const fetchMock = vi.fn(async (_input: RequestInfo | URL, _init?: RequestInit) =>
      new Response(JSON.stringify({ success: true, access_token: "token", expires_in: 900, user: {}, data: { id: "id" } }), { status: 200 }),
    );
    vi.stubGlobal("fetch", fetchMock);

    await loginSession("admin@example.com", "password");
    await serverCommands.createInitiative({ kind: "PROJECT", name: "Smoke", year: 2026, preparation: { department_ids: [] } });
    await serverCommands.updateCard("card-id", { revision: 1, department_ids: [], status_id: "00000000-0000-4000-8000-000000000001", scope: [] });
    await serverCommands.moveCard("card-id", 1, 2027, "Q1");
    await serverCommands.deleteCard("card-id", 2);
    await logoutSession();

    expect(fetchMock.mock.calls.map(([input]) => String(input))).toEqual([
      expect.stringContaining("/auth/login"),
      expect.stringContaining("/initiatives"),
      expect.stringContaining("/quarter-cards/card-id"),
      expect.stringContaining("/quarter-cards/card-id/move"),
      expect.stringContaining("/quarter-cards/card-id"),
      expect.stringContaining("/auth/logout"),
    ]);
  });

  it("notifies the app to clear authenticated cache after refresh fails", async () => {
    const handler = vi.fn();
    setAuthFailureHandler(handler);
    vi.stubGlobal("fetch", vi.fn(async () => new Response(JSON.stringify({ success: false, code: "INVALID_ACCESS_TOKEN", message: "expired" }), { status: 401 })));
    await expect(serverCommands.updateCard("card-id", { revision: 1, department_ids: [], status_id: "00000000-0000-4000-8000-000000000001", scope: [] })).rejects.toMatchObject({ status: 401 });
    expect(handler).toHaveBeenCalledOnce();
    setAuthFailureHandler(null);
  });

  it("clears the bearer token before the logout request completes", async () => {
    let finishLogout!: (response: Response) => void;
    const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      if (url.includes('/auth/login')) return new Response(JSON.stringify({ access_token: 'secret', expires_in: 900, user: {} }), { status: 200 });
      if (url.includes('/auth/logout')) return new Promise<Response>((resolve) => { finishLogout = resolve; });
      return new Response(JSON.stringify({ success: true }), { status: 200 });
    });
    vi.stubGlobal('fetch', fetchMock);
    await loginSession('admin@example.com', 'password');
    const pendingLogout = logoutSession();
    await serverCommands.recalculateSizes();
    const headers = new Headers(fetchMock.mock.calls[2][1]?.headers);
    expect(headers.has('authorization')).toBe(false);
    finishLogout(new Response(JSON.stringify({ success: true }), { status: 200 }));
    await pendingLogout;
  });

  it("loads one filtered server analytics read-model", async () => {
    const fetchMock = vi.fn(async (_input: RequestInfo | URL, _init?: RequestInit) => new Response(JSON.stringify({ success: true, data: {} }), { status: 200 }));
    vi.stubGlobal('fetch', fetchMock);
    await loadAnalytics('quarterly', new URLSearchParams({ year: '2027', quarter: 'Q2', kind: 'PROJECT' }));
    expect(fetchMock).toHaveBeenCalledOnce();
    expect(String(fetchMock.mock.calls[0][0])).toContain('/analytics/quarterly/summary?year=2027&quarter=Q2&kind=PROJECT');
  });
});
