import { describe, expect, it, vi } from 'vitest';
import { Prisma } from '../../../generated/prisma/client';
import { InitiativesService } from './initiatives.service';

const actor = { id: 'actor', name: 'Admin', email: 'admin@example.com', role: 'SUPER_ADMIN' as const, must_change_password: false };
const sourceGroup = { id: 'source-group', lineageId: 'group-lineage', title: 'Спільна група' };
const sourceItem = {
  id: 'source-item', lineageId: 'item-lineage', scopeGroupId: sourceGroup.id,
  scopeGroup: sourceGroup, sortOrder: 0, revision: 1, statusCode: 'YELLOW',
  text: 'Завдання', weightSnapshotValue: { toNumber: () => 5 }, executors: [],
};

const fixture = (matchingLineage: typeof sourceGroup | null, groups: typeof sourceGroup[] = []) => {
  const source = {
    id: 'source-card', revision: 2, quarter: 1, managerId: null, priorityId: null,
    initiativeYear: { year: 2099, initiativeId: 'initiative', initiative: { id: 'initiative' } },
    departments: [], customFieldValues: [], scopeItems: [sourceItem],
  };
  const target = { id: 'target-card', revision: 4, departments: [] };
  const tx: any = {
    quarterCard: {
      findUnique: vi.fn(async (args: any) => args.where.id ? source : target),
      updateMany: vi.fn(async () => ({ count: 1 })),
      update: vi.fn(async () => ({})),
    },
    initiativeYear: { findUnique: vi.fn(async () => ({ id: 'target-year' })) },
    scopeGroup: {
      findUnique: vi.fn(async () => matchingLineage),
      findMany: vi.fn(async () => groups),
      create: vi.fn(async ({ data }: any) => ({ id: 'created-group', ...data })),
      deleteMany: vi.fn(async () => ({ count: 1 })),
    },
    scopeItem: {
      findUnique: vi.fn(async () => null),
      findMany: vi.fn(async () => []),
      create: vi.fn(async () => ({ id: 'copied-item' })),
      updateMany: vi.fn(async () => ({ count: 1 })),
      update: vi.fn(async () => ({})),
    },
    taskWeight: { findFirst: vi.fn(async () => ({ id: 'default-weight', name: 'Не визначено', weight: 0 })) },
    quarterCardDepartment: {
      deleteMany: vi.fn(async () => ({})),
      findMany: vi.fn(async () => []),
      createMany: vi.fn(async () => ({})),
    },
    initiativeSize: { findMany: vi.fn(async () => []) },
    auditEvent: { create: vi.fn(async () => ({})) },
  };
  const prisma: any = {
    rolePermission: { findUnique: vi.fn(async () => ({ isReadOnly: false, canCreateEditInitiatives: true })) },
    $transaction: (callback: (client: any) => unknown) => callback(tx),
  };
  const dto = { revision: 2, target_revision: 4, to_year: 2099, to_quarter: 'Q2' as const };
  return { tx, service: new InitiativesService(prisma), dto };
};

describe('scope transfer group resolution', () => {
  it('prefers group lineage even when the target group has another title', async () => {
    const targetGroup = { id: 'lineage-group', lineageId: sourceGroup.lineageId, title: 'Перейменована' };
    const { tx, service, dto } = fixture(targetGroup);
    await service.moveScope('source-card', sourceItem.id, dto, actor);
    expect(tx.scopeGroup.create).not.toHaveBeenCalled();
    expect(tx.scopeItem.updateMany).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ scopeGroupId: targetGroup.id }),
    }));
    expect(tx.scopeGroup.deleteMany).toHaveBeenCalled();
  });

  it('reuses an independently created group with the same trimmed case-insensitive title', async () => {
    const targetGroup = { id: 'title-group', lineageId: 'other-lineage', title: ' спільна група ' };
    const { tx, service, dto } = fixture(null, [targetGroup]);
    await service.copyScope('source-card', sourceItem.id, dto, actor);
    expect(tx.scopeGroup.create).not.toHaveBeenCalled();
    expect(tx.scopeItem.create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ scopeGroupId: targetGroup.id }),
    }));
  });

  it('creates a group only if neither lineage nor title matches', async () => {
    const { tx, service, dto } = fixture(null, [{ id: 'other', lineageId: 'other', title: 'Інша група' }]);
    await service.copyScope('source-card', sourceItem.id, dto, actor);
    expect(tx.scopeGroup.create).toHaveBeenCalledWith({
      data: {
        quarterCardId: 'target-card', lineageId: sourceGroup.lineageId, title: sourceGroup.title,
      }
    });
  });

  it('keeps an ungrouped task ungrouped in the target card', async () => {
    const { tx, service, dto } = fixture(null);
    const sourceCard = await tx.quarterCard.findUnique({ where: { id: 'source-card' } });
    const targetCard = await tx.quarterCard.findUnique({ where: { initiativeYearId_quarter: {} } });
    tx.quarterCard.findUnique.mockImplementation(async (args: any) => {
      return args.where.id
        ? { ...sourceCard, scopeItems: [{ ...sourceItem, scopeGroup: null, scopeGroupId: null }] }
        : targetCard;
    });
    await service.copyScope('source-card', sourceItem.id, dto, actor);
    expect(tx.scopeGroup.findUnique).not.toHaveBeenCalled();
    expect(tx.scopeGroup.create).not.toHaveBeenCalled();
    expect(tx.scopeItem.create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ scopeGroupId: null }),
    }));
  });

  it('appends to the end of the matched group block and shifts following items', async () => {
    const targetGroup = { id: 'title-group', lineageId: 'other-lineage', title: sourceGroup.title };
    const { tx, service, dto } = fixture(null, [targetGroup]);
    tx.scopeItem.findMany.mockImplementation(async (args: any) =>
      args.select?.scopeGroupId
        ? [{ sortOrder: 0, scopeGroupId: targetGroup.id }, { sortOrder: 1, scopeGroupId: targetGroup.id }, { sortOrder: 2, scopeGroupId: null }]
        : [],
    );
    await service.moveScope('source-card', sourceItem.id, dto, actor);
    expect(tx.scopeItem.updateMany).toHaveBeenCalledWith({
      where: { quarterCardId: 'target-card', sortOrder: { gte: 2 } },
      data: { sortOrder: { increment: 1 } },
    });
    expect(tx.scopeItem.updateMany).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ sortOrder: 2, scopeGroupId: targetGroup.id }),
    }));
    expect(tx.scopeGroup.deleteMany).toHaveBeenCalledWith({
      where: { id: sourceGroup.id, scopeItems: { none: {} } },
    });
    expect(tx.scopeItem.findMany).toHaveBeenCalledWith({
      where: { quarterCardId: 'target-card' },
      select: { id: true, sortOrder: true },
      orderBy: [{ sortOrder: 'asc' }, { id: 'asc' }],
    });
  });

  it('still blocks transferring an item with the same lineage', async () => {
    const { tx, service, dto } = fixture(null);
    tx.scopeItem.findUnique.mockResolvedValue({ id: 'existing-item' });
    await expect(service.copyScope('source-card', sourceItem.id, dto, actor))
      .rejects.toMatchObject({ code: 'SCOPE_LINEAGE_CONFLICT', status: 409 });
    expect(tx.scopeGroup.create).not.toHaveBeenCalled();
  });

  it('rejects a stale target before writing a group or scope item', async () => {
    const { tx, service, dto } = fixture(null);
    await expect(service.moveScope('source-card', sourceItem.id, { ...dto, target_revision: 3 }, actor))
      .rejects.toMatchObject({ code: 'REVISION_CONFLICT', status: 409 });
    expect(tx.scopeGroup.create).not.toHaveBeenCalled();
    expect(tx.scopeItem.updateMany).not.toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ quarterCardId: 'target-card' }),
    }));
  });

  it('requires a target revision before writing to an existing card', async () => {
    const { tx, service, dto } = fixture(null);
    await expect(service.moveScope('source-card', sourceItem.id, { ...dto, target_revision: undefined }, actor))
      .rejects.toMatchObject({ code: 'TARGET_REVISION_REQUIRED', status: 409 });
    expect(tx.scopeGroup.create).not.toHaveBeenCalled();
  });

  it('returns a clear conflict when a concurrent group creation hits the unique title constraint', async () => {
    const { tx, service, dto } = fixture(null);
    tx.scopeGroup.create.mockRejectedValue(new Prisma.PrismaClientKnownRequestError('Unique constraint', {
      code: 'P2002', clientVersion: 'test',
    }));
    await expect(service.copyScope('source-card', sourceItem.id, dto, actor))
      .rejects.toMatchObject({ code: 'TARGET_SCOPE_GROUP_CONFLICT', status: 409 });
  });
});
