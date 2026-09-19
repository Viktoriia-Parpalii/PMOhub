import { describe, expect, it, vi } from "vitest";
import { SystemSettingsService } from "./system-settings.service";

const actor = {
  id: "00000000-0000-4000-8000-000000000099",
  name: "Admin",
  email: "admin@example.com",
  role: "ADMIN",
  must_change_password: false,
};

const allowedPermission = {
  canAccessAdmin: true,
  isReadOnly: false,
  roleDefinition: { isActive: true },
};

describe("SystemSettingsService", () => {
  it("returns safe defaults when the row is missing or invalid", async () => {
    const prisma: any = {
      systemSetting: { findUnique: vi.fn().mockResolvedValueOnce(null) },
    };
    const service = new SystemSettingsService(prisma);
    await expect(service.getFilterOptionVisibility()).resolves.toEqual({
      revision: 1,
      analytics: "ACTIVE_ONLY",
      portfolio: "ACTIVE_ONLY",
      backlog: "ACTIVE_ONLY",
    });

    prisma.systemSetting.findUnique.mockResolvedValueOnce({
      revision: 7,
      valueJson: "not-json",
    });
    await expect(service.getFilterOptionVisibility()).resolves.toEqual({
      revision: 7,
      analytics: "ACTIVE_ONLY",
      portfolio: "ACTIVE_ONLY",
      backlog: "ACTIVE_ONLY",
    });
  });

  it("updates by revision and writes audit in the same transaction", async () => {
    const current = {
      key: "FILTER_OPTION_VISIBILITY",
      revision: 3,
      valueJson:
        '{"analytics":"ACTIVE_ONLY","portfolio":"ACTIVE_ONLY","backlog":"ACTIVE_ONLY"}',
    };
    const tx: any = {
      systemSetting: {
        findUnique: vi
          .fn()
          .mockResolvedValueOnce(current)
          .mockResolvedValueOnce({ ...current, revision: 4 }),
        updateMany: vi.fn(async () => ({ count: 1 })),
        findUniqueOrThrow: vi.fn(async () => ({ ...current, revision: 4 })),
      },
      auditEvent: { create: vi.fn(async () => ({})) },
    };
    const prisma: any = {
      rolePermission: { findUnique: vi.fn(async () => allowedPermission) },
      $transaction: vi.fn(async (callback) => callback(tx)),
    };
    const service = new SystemSettingsService(prisma);
    const result = await service.updateFilterOptionVisibility(
      {
        revision: 3,
        analytics: "ALL",
        portfolio: "ACTIVE_ONLY",
        backlog: "ALL",
      },
      actor,
    );

    expect(result).toEqual({
      revision: 4,
      analytics: "ALL",
      portfolio: "ACTIVE_ONLY",
      backlog: "ALL",
    });
    expect(tx.systemSetting.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { key: "FILTER_OPTION_VISIBILITY", revision: 3 },
      }),
    );
    expect(tx.auditEvent.create).toHaveBeenCalledOnce();
  });

  it("rejects a stale revision", async () => {
    const tx: any = {
      systemSetting: {
        findUnique: vi.fn(async () => ({
          key: "FILTER_OPTION_VISIBILITY",
          revision: 5,
          valueJson:
            '{"analytics":"ACTIVE_ONLY","portfolio":"ACTIVE_ONLY","backlog":"ACTIVE_ONLY"}',
        })),
        updateMany: vi.fn(async () => ({ count: 0 })),
      },
    };
    const prisma: any = {
      rolePermission: { findUnique: vi.fn(async () => allowedPermission) },
      $transaction: vi.fn(async (callback) => callback(tx)),
    };
    const service = new SystemSettingsService(prisma);
    await expect(
      service.updateFilterOptionVisibility(
        {
          revision: 4,
          analytics: "ALL",
          portfolio: "ALL",
          backlog: "ALL",
        },
        actor,
      ),
    ).rejects.toMatchObject({
      code: "REVISION_CONFLICT",
      status: 409,
      details: { current_revision: 5 },
    });
  });

  it("does not allow a read-only administrator to update settings", async () => {
    const prisma: any = {
      rolePermission: {
        findUnique: vi.fn(async () => ({
          ...allowedPermission,
          isReadOnly: true,
        })),
      },
    };
    const service = new SystemSettingsService(prisma);
    await expect(
      service.updateFilterOptionVisibility(
        {
          revision: 1,
          analytics: "ALL",
          portfolio: "ALL",
          backlog: "ALL",
        },
        actor,
      ),
    ).rejects.toMatchObject({ code: "FORBIDDEN", status: 403 });
  });
});
