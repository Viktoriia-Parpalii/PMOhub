import { describe, expect, it, vi } from "vitest";
import { ApiError } from "../../api/apiClient";
import { executeBackendMutation } from "./backend-mutation";
import { NOTIFICATION_CONFIG, NOTIFICATION_KINDS } from "../../shared/constants/notificationConstants";

describe("server-first mutation flow", () => {
  it("refreshes server state only after a successful commit", async () => {
    const order: string[] = [];
    const request = vi.fn(async () => {
      order.push("commit");
      return { success: true, message: "saved", data: { id: "A" } };
    });
    const hydrate = vi.fn(async () => { order.push("get"); });

    const result = await executeBackendMutation(request, hydrate);

    expect(result).toMatchObject({ success: true, message: "saved", status: "SUCCESS" });
    expect(order).toEqual(["commit", "get"]);
  });

  it("emits success only after canonical hydration finishes", async () => {
    const order: string[] = [];
    const listener = (event: Event) => {
      const detail = (event as CustomEvent<{ kind: string; message: string }>).detail;
      order.push(`notify:${detail.kind}:${detail.message}`);
    };
    window.addEventListener(NOTIFICATION_CONFIG.eventName, listener);

    try {
      await executeBackendMutation(
        async () => { order.push("commit"); return { success: true, message: "notification-success-test" }; },
        async () => { order.push("hydrate"); },
      );
      expect(order).toEqual(["commit", "hydrate", `notify:${NOTIFICATION_KINDS.success}:notification-success-test`]);
    } finally {
      window.removeEventListener(NOTIFICATION_CONFIG.eventName, listener);
    }
  });

  it("uses a longer visibility duration for errors", () => {
    expect(NOTIFICATION_CONFIG.durationMs.error).toBeGreaterThan(NOTIFICATION_CONFIG.durationMs.success);
  });

  it("does not report a committed command as a commit failure when hydration fails", async () => {
    const hydrate = vi.fn(async () => { throw new Error("offline"); });
    const result = await executeBackendMutation(async () => ({ success: true, message: "saved" }), hydrate);
    expect(result).toMatchObject({ success: false, committed: true, status: "COMMITTED_REFRESH_FAILED" });
    expect(hydrate).toHaveBeenCalledTimes(3);
  });

  it("preserves one-time response data when canonical hydration fails", async () => {
    const hydrate = vi.fn(async () => { throw new Error("offline"); });
    const result = await executeBackendMutation(
      async () => ({
        success: true,
        message: "committed",
        data: { temporary_password: "OneTime-Password-123" },
      }),
      hydrate,
    );

    expect(result).toMatchObject({
      success: false,
      committed: true,
      status: "COMMITTED_REFRESH_FAILED",
      data: { temporary_password: "OneTime-Password-123" },
    });
    expect(hydrate).toHaveBeenCalledTimes(3);
  });

  it("keeps cached state untouched when a command fails", async () => {
    const hydrate = vi.fn(async () => undefined);
    const result = await executeBackendMutation(
      async () => { throw new ApiError("INVALID", "rejected", 422); },
      hydrate,
    );
    expect(result).toMatchObject({ success: false, message: "rejected", committed: false, status: "COMMIT_FAILED" });
    expect(hydrate).not.toHaveBeenCalled();
  });

  it("reloads the canonical entity after a revision conflict", async () => {
    const hydrate = vi.fn(async () => undefined);
    const result = await executeBackendMutation(
      async () => { throw new ApiError("REVISION_CONFLICT", "stale", 409, { actual_revision: 3 }); },
      hydrate,
    );
    expect(result.success).toBe(false);
    expect(hydrate).toHaveBeenCalledOnce();
  });
});
