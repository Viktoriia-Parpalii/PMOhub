import { describe, expect, it, vi } from "vitest";
import { InitiativesService } from "./initiatives.service";

const passport = {
  name: "Portfolio item",
  strategicGoal: null,
  managerId: null,
  priorityId: null,
  notes: null,
  departments: [],
  customValues: [],
};

describe("InitiativesService canonical reads and concurrency", () => {
  it("returns the canonical annual read model", async () => {
    const prisma = {
      auditEvent: { findMany: vi.fn(async () => []) },
      initiativeYear: {
        findUnique: vi.fn(async () => ({
          id: "year-id",
          initiativeId: "chain-id",
          year: 2026,
          revision: 4,
          initiative: { kind: "PROJECT" },
          annualPassport: passport,
          preparationPassport: passport,
        })),
      },
    };
    const service = new InitiativesService(prisma as any, { get: () => "Europe/Kyiv" } as any);
    const result = await service.getYear("year-id");
    expect(result.data).toMatchObject({ id: "year-id", revision: 4, is_backlog: true });
  });

  it("returns HTTP 409 details with the current revision", async () => {
    const tx = {
      rolePermission: { findUnique: vi.fn(async () => ({ canCreateEditProjects: true, isReadOnly: false, canEditArchive: true })) },
      quarterCard: {
        findUnique: vi.fn(async () => ({
          id: "card-id",
          revision: 3,
          quarter: "Q4",
          initiativeYear: { year: 2026 },
        })),
      },
    };
    const prisma = { $transaction: vi.fn(async (callback: (client: unknown) => unknown) => callback(tx)) };
    const service = new InitiativesService(prisma as any, { get: () => "Europe/Kyiv" } as any);

    await expect(service.updateCard("card-id", { revision: 2 } as any, { id: "actor", name: "Actor", role: "ADMIN" } as any))
      .rejects.toMatchObject({ code: "REVISION_CONFLICT", status: 409, details: { actual_revision: 3 } });
  });

  it("recalculates the persisted size after scope composition changes", async () => {
    const update = vi.fn(async () => undefined);
    const tx = {
      checklistItem: { findMany: vi.fn(async () => [{ weightSnapshotValue: { toNumber: () => 5 } }]) },
      initiativeSize: { findMany: vi.fn(async () => [{ id: "size", name: "M", minScore: { toNumber: () => 4 }, maxScore: { toNumber: () => 6 }, isActive: true }]) },
      quarterCard: { update },
    };
    const service = new InitiativesService({} as any, { get: () => "Europe/Kyiv" } as any);
    await (service as any).refreshCardSize(tx, "card");
    expect(update).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ sizeDefinitionId: "size", sizeSnapshotWeight: 5 }) }));
  });
});
