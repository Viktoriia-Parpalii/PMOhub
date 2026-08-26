import { describe, expect, it, vi } from "vitest";
import { ApiError } from "../../api/apiClient";
import { executeBackendMutation } from "./backend-mutation";

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

  it("does not report a committed command as a commit failure when hydration fails", async () => {
    const hydrate = vi.fn(async () => { throw new Error("offline"); });
    const result = await executeBackendMutation(async () => ({ success: true, message: "saved" }), hydrate);
    expect(result).toMatchObject({ success: false, committed: true, status: "COMMITTED_REFRESH_FAILED" });
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
