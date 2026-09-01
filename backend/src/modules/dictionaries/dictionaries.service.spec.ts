import { describe, expect, it, vi } from "vitest";
import { DictionariesService } from "./dictionaries.service";

describe("DictionariesService bulk commands", () => {
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
});
