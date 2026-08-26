import { describe, expect, it, vi } from "vitest";
import { DictionariesService } from "./dictionaries.service";

describe("DictionariesService bulk commands", () => {
  it("commits weight propagation as one transaction", async () => {
    const tx = {
      taskWeight: { findUnique: vi.fn(async () => ({ id: "weight-id", name: "Large", weight: { toNumber: () => 5 } })) },
      quarterCard: { findMany: vi.fn(async () => []) },
      initiativeSize: { findMany: vi.fn(async () => []) },
    };
    const prisma = { $transaction: vi.fn(async (callback: (client: unknown) => unknown) => callback(tx)) };
    const service = new DictionariesService(prisma as any, { get: () => "Europe/Kyiv" } as any);

    const result = await service.applyWeightToOpenCards("weight-id");

    expect(prisma.$transaction).toHaveBeenCalledOnce();
    expect(result).toMatchObject({ success: true, data: { cards: 0, tasks: 0 } });
  });
});
