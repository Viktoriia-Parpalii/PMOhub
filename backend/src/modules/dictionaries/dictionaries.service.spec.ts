import { describe, expect, it, vi } from "vitest";
import { DictionariesService } from "./dictionaries.service";

describe("DictionariesService bulk commands", () => {
  const actor = {
    id: "admin",
    name: "Admin",
    email: "admin@example.com",
    role: "SUPER_ADMIN",
    must_change_password: false,
  } as const;

  it("creates a department and its initial capacity history in one transaction", async () => {
    const capacityCreate = vi.fn(async () => ({}));
    const tx = {
      department: {
        create: vi.fn(async ({ data }) => ({
          id: "department",
          ...data,
          capacityLimitPoints: { toNumber: () => data.capacityLimitPoints },
        })),
      },
      departmentCapacityHistory: { create: capacityCreate },
      auditEvent: { create: vi.fn(async () => ({})) },
    };
    const prisma = {
      rolePermission: { findUnique: vi.fn(async () => ({ canAccessAdmin: true, isReadOnly: false, roleDefinition: { isActive: true } })) },
      $transaction: vi.fn(async (callback: (client: unknown) => unknown) => callback(tx)),
    };
    const service = new DictionariesService(prisma as any, { get: () => "Europe/Kyiv" } as any);
    await service.create("departments", { name: "IT", capacity_limit_points: 15 }, actor);
    expect(capacityCreate).toHaveBeenCalledWith({
      data: expect.objectContaining({
        departmentId: "department",
        limitPoints: expect.anything(),
        effectiveYear: expect.any(Number),
        effectiveQuarter: expect.any(Number),
        changedByUserId: "admin",
      }),
    });
    expect(prisma.$transaction).toHaveBeenCalledOnce();
  });

  it("appends capacity history only when the numeric limit changes", async () => {
    const capacityCreate = vi.fn(async () => ({}));
    const current = {
      name: "IT",
      isActive: true,
      capacityLimitPoints: { equals: (value: number) => value === 15, toNumber: () => 15 },
    };
    const tx = {
      department: { findUnique: vi.fn(async () => current), update: vi.fn(async () => ({})) },
      departmentCapacityHistory: { create: capacityCreate },
      auditEvent: { create: vi.fn(async () => ({})) },
    };
    const prisma = {
      rolePermission: { findUnique: vi.fn(async () => ({ canAccessAdmin: true, isReadOnly: false, roleDefinition: { isActive: true } })) },
      $transaction: vi.fn(async (callback: (client: unknown) => unknown) => callback(tx)),
    };
    const service = new DictionariesService(prisma as any, { get: () => "Europe/Kyiv" } as any);
    await service.update("departments", "department", { capacity_limit_points: 15 }, actor);
    expect(capacityCreate).not.toHaveBeenCalled();
    await service.update("departments", "department", { capacity_limit_points: 20 }, actor);
    expect(capacityCreate).toHaveBeenCalledOnce();
  });

  it("generates a database-safe internal code when the UI creates a status", async () => {
    const create = vi.fn(async ({ data }) => ({ id: "status-id", ...data }));
    const tx = {
      initiativeStatus: { create },
      auditEvent: { create: vi.fn(async () => ({})) },
    };
    const prisma = {
      rolePermission: {
        findUnique: vi.fn(async () => ({
          canAccessAdmin: true,
          isReadOnly: false,
          roleDefinition: { isActive: true },
        })),
      },
      $transaction: vi.fn(async (callback: (client: unknown) => unknown) =>
        callback(tx),
      ),
    };
    const service = new DictionariesService(
      prisma as any,
      { get: () => "Europe/Kyiv" } as any,
    );

    await service.create(
      "statuses",
      { name: "Очікує рішення", color: "#123456", is_active: true },
      {
        id: "admin",
        name: "Admin",
        email: "admin@example.com",
        role: "SUPER_ADMIN",
        must_change_password: false,
      },
    );

    expect(create).toHaveBeenCalledWith({
      data: expect.objectContaining({ code: expect.stringMatching(/^[0-9a-f]{32}$/) }),
    });
  });

  it("commits weight snapshot refresh as one transaction", async () => {
    const tx = {
      taskWeight: { findUnique: vi.fn(async () => ({ id: "weight-id", name: "Large", weight: { toNumber: () => 5 } })) },
      quarterCard: { findMany: vi.fn(async () => []) },
      initiativeSize: { findMany: vi.fn(async () => []) },
      auditEvent: { create: vi.fn(async () => ({})) },
    };
    const prisma = {
      rolePermission: { findUnique: vi.fn(async () => ({ canAccessAdmin: true, isReadOnly: false })) },
      $transaction: vi.fn(async (callback: (client: unknown) => unknown) => callback(tx)),
    };
    const service = new DictionariesService(prisma as any, { get: () => "Europe/Kyiv" } as any);

    const result = await service.applyWeightToOpenCards("weight-id", { id: "admin", name: "Admin", email: "admin@example.com", role: "SUPER_ADMIN", must_change_password: false });

    expect(prisma.$transaction).toHaveBeenCalledOnce();
    expect(result).toMatchObject({ success: true, data: { cards: 0, tasks: 0 } });
  });

  it("deactivates a used non-system weight instead of deleting referenced data", async () => {
    const update = vi.fn(async () => ({}));
    const remove = vi.fn(async () => ({}));
    const tx = {
      taskWeight: { update, delete: remove },
      auditEvent: { create: vi.fn(async () => ({})) },
    };
    const prisma = {
      rolePermission: {
        findUnique: vi.fn(async () => ({
          canAccessAdmin: true,
          isReadOnly: false,
          roleDefinition: { isActive: true },
        })),
      },
      taskWeight: { findUnique: vi.fn(async () => ({ isSystem: false })) },
      scopeItem: { count: vi.fn(async () => 1) },
      $transaction: vi.fn(async (callback: (client: unknown) => unknown) =>
        callback(tx),
      ),
    };
    const service = new DictionariesService(
      prisma as any,
      { get: () => "Europe/Kyiv" } as any,
    );

    await service.remove("weights", "weight-id", {
      id: "admin",
      name: "Admin",
      email: "admin@example.com",
      role: "SUPER_ADMIN",
      must_change_password: false,
    });

    expect(update).toHaveBeenCalledWith({
      where: { id: "weight-id" },
      data: { isActive: false },
    });
    expect(remove).not.toHaveBeenCalled();
  });
});
