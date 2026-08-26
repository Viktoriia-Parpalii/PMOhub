import { afterEach, describe, expect, it, vi } from "vitest";
import { serverCommands } from "./server-commands";
import { loginSession, logoutSession, setAuthFailureHandler } from "../../api/apiClient";

describe("server command routing", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("uses the domain endpoint and never the backup import for a normal edit", async () => {
    const fetchMock = vi.fn(async (_input: RequestInfo | URL, _init?: RequestInit) => new Response(JSON.stringify({ success: true, message: "ok" }), {
      status: 200,
      headers: { "content-type": "application/json" },
    }));
    vi.stubGlobal("fetch", fetchMock);

    await serverCommands.updateCard("card-id", { revision: 1 });

    expect(fetchMock).toHaveBeenCalledOnce();
    expect(String(fetchMock.mock.calls[0][0])).toContain("/initiatives/cards/card-id");
    expect(String(fetchMock.mock.calls[0][0])).not.toContain("/backups/import");
  });

  it("uses the canonical role-permissions route", async () => {
    const fetchMock = vi.fn(async (_input: RequestInfo | URL, _init?: RequestInit) => new Response(JSON.stringify({ success: true }), { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);
    await serverCommands.updatePermission("ADMIN", { canAccessAdmin: true });
    expect(String(fetchMock.mock.calls[0][0])).toContain("/role-permissions/ADMIN");
  });

  it("covers the login-create-edit-move-delete-logout smoke flow", async () => {
    const fetchMock = vi.fn(async (_input: RequestInfo | URL, _init?: RequestInit) =>
      new Response(JSON.stringify({ success: true, access_token: "token", expires_in: 900, user: {}, data: { id: "id" } }), { status: 200 }),
    );
    vi.stubGlobal("fetch", fetchMock);

    await loginSession("admin@example.com", "password");
    await serverCommands.createInitiative({ kind: "project", year: 2026, passport: { name: "Smoke", implementer_dept_ids: [], cross_functional_dept_ids: [] }, quarters: [] });
    await serverCommands.updateCard("card-id", { revision: 1 });
    await serverCommands.moveCard("card-id", 1, 2027, "Q1");
    await serverCommands.deleteCard("card-id", 2);
    await logoutSession();

    expect(fetchMock.mock.calls.map(([input]) => String(input))).toEqual([
      expect.stringContaining("/auth/login"),
      expect.stringContaining("/initiatives"),
      expect.stringContaining("/initiatives/cards/card-id"),
      expect.stringContaining("/initiatives/cards/card-id/move"),
      expect.stringContaining("/initiatives/cards/card-id"),
      expect.stringContaining("/auth/logout"),
    ]);
  });

  it("notifies the app to clear authenticated cache after refresh fails", async () => {
    const handler = vi.fn();
    setAuthFailureHandler(handler);
    vi.stubGlobal("fetch", vi.fn(async () => new Response(JSON.stringify({ success: false, code: "INVALID_ACCESS_TOKEN", message: "expired" }), { status: 401 })));
    await expect(serverCommands.updateCard("card-id", { revision: 1 })).rejects.toMatchObject({ status: 401 });
    expect(handler).toHaveBeenCalledOnce();
    setAuthFailureHandler(null);
  });
});
