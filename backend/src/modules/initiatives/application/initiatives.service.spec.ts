import { describe, expect, it, vi } from 'vitest';
import { InitiativesService } from './initiatives.service';

const actor = { id: '00000000-0000-4000-8000-000000000099', name: 'Admin', email: 'admin@example.com', role: 'SUPER_ADMIN' as const, must_change_password: false };

describe('InitiativesService transactional rules', () => {
  it('updates status with a small command and returns exactly the updated card', async () => {
    const card = {
      id: 'card-1',
      initiativeYearId: 'year-1',
      initiativeYear: {
        initiativeId: 'initiative-1',
        year: 2099,
        strategicGoal: null,
        initiative: { id: 'initiative-1', kind: 'PROJECT', name: 'Card' },
      },
      quarter: 1,
      managerId: null,
      manager: null,
      priorityId: null,
      priority: null,
      departments: [],
      statusId: 'status-new',
      status: { id: 'status-new', code: 'ACTIVE', name: 'Активний', color: '#123456' },
      sizeDefinitionId: null,
      sizeDefinition: null,
      sizeSnapshotName: 'Не визначено',
      sizeSnapshotMin: null,
      sizeSnapshotMax: null,
      totalWeight: { toNumber: () => 0 },
      notes: null,
      customFieldValues: [],
      scopeItems: [],
      movedFromYear: null,
      movedFromQuarter: null,
      revision: 2,
    };
    const tx: any = {
      initiativeStatus: { findFirst: vi.fn(async () => ({ id: 'status-new', isActive: true })) },
      quarterCard: {
        updateMany: vi.fn(async () => ({ count: 1 })),
        findUniqueOrThrow: vi.fn(async () => card),
      },
      auditEvent: { create: vi.fn(async () => ({})) },
    };
    const prisma: any = {
      quarterCard: {
        findUnique: vi.fn(async () => ({ id: 'card-1', quarter: 1, initiativeYear: { year: 2099 } })),
      },
      rolePermission: {
        findUnique: vi.fn(async () => ({ isReadOnly: false, canCreateEditInitiatives: true })),
      },
      $transaction: vi.fn(async (callback: (client: any) => unknown) => callback(tx)),
    };

    const result = await new InitiativesService(prisma).updateCardStatus(
      'card-1',
      { revision: 1, status_id: 'status-new' },
      actor,
    );

    expect(result.data).toMatchObject({ id: 'card-1', status_id: 'status-new', revision: 2 });
    expect(Array.isArray(result.data)).toBe(false);
    expect(tx.quarterCard.updateMany).toHaveBeenCalledWith({
      where: { id: 'card-1', revision: 1 },
      data: { statusId: 'status-new', revision: { increment: 1 } },
    });
  });

  it('creates the root, year, preparation and initial card inside one transaction', async () => {
    const tx: any = {
      initiative: {
        findFirst: vi.fn(async () => null),
        create: vi.fn(async () => ({ id: 'initiative-1', revision: 1, years: [{ id: 'year-1' }] })),
      },
      initiativeStatus: { findUnique: vi.fn(async () => ({ id: 'default-status', isActive: true })) },
      taskWeight: { findMany: vi.fn(async () => []) },
      quarterCard: { create: vi.fn(async () => { throw new Error('card insert failed'); }) },
    };
    const prisma: any = {
      rolePermission: { findUnique: vi.fn(async () => ({ isReadOnly: false, canCreateEditInitiatives: true })) },
      $transaction: vi.fn(async (callback: (client: any) => unknown) => callback(tx)),
    };

    await expect(new InitiativesService(prisma).create({
      kind: 'PROJECT',
      name: 'Atomic create',
      year: 2027,
      preparation: { department_ids: [] },
      initial_card: { quarter: 'Q1', department_ids: [], scope: [] },
    }, actor)).rejects.toThrow('card insert failed');

    expect(prisma.$transaction).toHaveBeenCalledOnce();
    expect(tx.initiative.create).toHaveBeenCalledOnce();
    expect(tx.quarterCard.create).toHaveBeenCalledOnce();
  });

  it('rejects a duplicate initiative name in the same portfolio kind', async () => {
    const tx: any = {
      initiative: { findFirst: vi.fn(async () => ({ id: 'existing-initiative' })) },
    };
    const prisma: any = {
      rolePermission: { findUnique: vi.fn(async () => ({ isReadOnly: false, canCreateEditInitiatives: true })) },
      $transaction: vi.fn(async (callback: (client: any) => unknown) => callback(tx)),
    };

    await expect(new InitiativesService(prisma).create({
      kind: 'PROJECT',
      name: ' Existing initiative ',
      year: 2027,
      preparation: { department_ids: [] },
    }, actor)).rejects.toMatchObject({ code: 'INITIATIVE_NAME_CONFLICT', status: 409 });

    expect(tx.initiative.findFirst).toHaveBeenCalledWith({
      where: { kind: 'PROJECT', name: 'Existing initiative' },
      select: { id: true },
    });
  });

  it('updates global name and yearly goal atomically in one transaction', async () => {
    const tx: any = {
      initiativeYear: {
        findUnique: vi.fn(async () => ({ id: 'year-1', initiativeId: 'initiative-1', year: 2027 })),
        updateMany: vi.fn(async () => ({ count: 1 })),
      },
      initiative: { updateMany: vi.fn(async () => ({ count: 1 })) },
      auditEvent: { create: vi.fn(async () => ({})) },
    };
    const prisma: any = {
      rolePermission: { findUnique: vi.fn(async () => ({ isReadOnly: false, canCreateEditInitiatives: true })) },
      $transaction: vi.fn(async (callback: (client: any) => unknown) => callback(tx)),
    };

    const result = await new InitiativesService(prisma).updateBacklog('year-1', {
      name: 'Updated name',
      strategic_goal: 'Updated goal',
      initiative_revision: 2,
      year_revision: 4,
    }, actor);

    expect(prisma.$transaction).toHaveBeenCalledOnce();
    expect(tx.initiative.updateMany).toHaveBeenCalledWith(expect.objectContaining({ where: { id: 'initiative-1', revision: 2 } }));
    expect(tx.initiativeYear.updateMany).toHaveBeenCalledWith(expect.objectContaining({ where: { id: 'year-1', revision: 4 } }));
    expect(result.data).toMatchObject({ initiative_revision: 3, year_revision: 5 });
  });

  it('creates only newly added executor links when a scope item is saved', async () => {
    const tx: any = {
      scopeItemExecutor: {
        deleteMany: vi.fn(async () => ({ count: 1 })),
        createMany: vi.fn(async () => ({ count: 1 })),
      },
    };
    const service = new InitiativesService({} as any);

    await (service as any).syncScopeExecutors(
      tx,
      'scope-1',
      ['department-existing', 'department-added'],
      new Set(['department-existing', 'department-removed']),
    );

    expect(tx.scopeItemExecutor.deleteMany).toHaveBeenCalledWith({
      where: { scopeItemId: 'scope-1', departmentId: { notIn: ['department-existing', 'department-added'] } },
    });
    expect(tx.scopeItemExecutor.createMany).toHaveBeenCalledWith({
      data: [{ scopeItemId: 'scope-1', departmentId: 'department-added' }],
    });
  });

  it('does not block a card update when department capacity is exceeded', async () => {
    const tx: any = {
      quarterCard: {
        findUnique: vi.fn(async () => ({
          id: 'card-1',
          revision: 1,
          quarter: 1,
          initiativeYear: {
            year: 2099,
            initiative: { kind: 'PROJECT' },
          },
          scopeItems: [],
        })),
        updateMany: vi.fn(async () => ({ count: 1 })),
        update: vi.fn(async () => ({})),
      },
      initiativeStatus: {
        findFirst: vi.fn(async () => ({ id: 'status-in-progress', isActive: true })),
      },
      taskWeight: { findMany: vi.fn(async () => []) },
      scopeItem: {
        updateMany: vi.fn(async () => ({ count: 0 })),
        deleteMany: vi.fn(async () => ({ count: 0 })),
        findMany: vi.fn(async () => []),
      },
      quarterCardDepartment: {
        deleteMany: vi.fn(async () => ({ count: 0 })),
        findMany: vi.fn(async () => []),
        createMany: vi.fn(async () => ({ count: 0 })),
      },
      customFieldDefinition: { findMany: vi.fn(async () => []) },
      customFieldValue: { deleteMany: vi.fn(async () => ({ count: 0 })) },
      initiativeSize: { findMany: vi.fn(async () => []) },
      auditEvent: { create: vi.fn(async () => ({})) },
      /* Deliberately no department.findMany capacity query. */
    };
    const prisma: any = {
      rolePermission: {
        findUnique: vi.fn(async () => ({
          isReadOnly: false,
          canCreateEditInitiatives: true,
        })),
      },
      $transaction: vi.fn(async (callback: (client: any) => unknown) => callback(tx)),
    };

    const result = await new InitiativesService(prisma).updateCard('card-1', {
      revision: 1,
      department_ids: [],
      status_id: 'status-in-progress',
      scope: [],
      custom_fields: {},
    }, actor);

    expect(result).toMatchObject({
      success: true,
      data: { card_id: 'card-1', card_revision: 2 },
    });
    expect(tx.quarterCard.updateMany).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ statusId: 'status-in-progress' }),
    }));
  });

  it('does not allow a completed scope item to be removed by an update payload', async () => {
    const tx: any = {
      quarterCard: {
        findUnique: vi.fn(async () => ({
          id: 'card-1',
          revision: 1,
          quarter: 1,
          initiativeYear: {
            year: 2099,
            initiative: { kind: 'PROJECT' },
          },
          scopeItems: [{
            id: 'scope-completed',
            revision: 3,
            statusCode: 'GREEN',
            executors: [],
          }],
        })),
        updateMany: vi.fn(async () => ({ count: 1 })),
      },
      initiativeStatus: {
        findFirst: vi.fn(async () => ({ id: 'status-in-progress', isActive: true })),
      },
      taskWeight: { findMany: vi.fn(async () => []) },
    };
    const prisma: any = {
      rolePermission: {
        findUnique: vi.fn(async () => ({
          isReadOnly: false,
          canCreateEditInitiatives: true,
        })),
      },
      $transaction: vi.fn(async (callback: (client: any) => unknown) => callback(tx)),
    };

    await expect(new InitiativesService(prisma).updateCard('card-1', {
      revision: 1,
      department_ids: [],
      status_id: 'status-in-progress',
      scope: [],
      custom_fields: {},
    }, actor)).rejects.toMatchObject({
      code: 'COMPLETED_SCOPE_DELETE_FORBIDDEN',
      status: 409,
    });

    expect(tx.quarterCard.updateMany).not.toHaveBeenCalled();
  });

  it('preserves a scope weight snapshot when a card is saved without changing its weight', async () => {
    const scopeId = '00000000-0000-4000-8000-000000000010';
    const weightId = '00000000-0000-4000-8000-000000000020';
    const departmentId = '00000000-0000-4000-8000-000000000030';
    const updateScope = vi.fn(async (_args: any) => ({ count: 1 }));
    const findWeights = vi.fn(async () => []);
    const currentScope = {
      id: scopeId,
      revision: 2,
      statusCode: 'YELLOW',
      weightDefinitionId: weightId,
      weightSnapshotName: 'Стара назва',
      weightSnapshotValue: { toNumber: () => 5 },
      executors: [{ departmentId }],
    };
    const tx: any = {
      quarterCard: {
        findUnique: vi.fn(async () => ({
          id: 'card-1',
          revision: 1,
          quarter: 1,
          initiativeYear: {
            year: 2099,
            initiative: { kind: 'PROJECT' },
          },
          scopeItems: [currentScope],
        })),
        updateMany: vi.fn(async () => ({ count: 1 })),
        update: vi.fn(async () => ({})),
      },
      initiativeStatus: {
        findFirst: vi.fn(async () => ({ id: 'status-in-progress', isActive: true })),
      },
      taskWeight: { findMany: findWeights },
      department: { count: vi.fn(async () => 1) },
      scopeItem: {
        updateMany: updateScope,
        deleteMany: vi.fn(async () => ({ count: 0 })),
        findMany: vi.fn(async () => [currentScope]),
      },
      scopeItemExecutor: {
        deleteMany: vi.fn(async () => ({ count: 0 })),
        createMany: vi.fn(async () => ({ count: 0 })),
      },
      quarterCardDepartment: {
        deleteMany: vi.fn(async () => ({ count: 0 })),
        findMany: vi.fn(async () => []),
        createMany: vi.fn(async () => ({ count: 0 })),
      },
      customFieldDefinition: { findMany: vi.fn(async () => []) },
      customFieldValue: { deleteMany: vi.fn(async () => ({ count: 0 })) },
      initiativeSize: { findMany: vi.fn(async () => []) },
      auditEvent: { create: vi.fn(async () => ({})) },
    };
    const prisma: any = {
      rolePermission: {
        findUnique: vi.fn(async () => ({
          isReadOnly: false,
          canCreateEditInitiatives: true,
        })),
      },
      $transaction: vi.fn(async (callback: (client: any) => unknown) => callback(tx)),
    };

    await new InitiativesService(prisma).updateCard('card-1', {
      revision: 1,
      department_ids: [],
      status_id: 'status-in-progress',
      scope: [{
        id: scopeId,
        revision: 2,
        text: 'Task',
        status_code: 'YELLOW',
        weight_definition_id: weightId,
        executor_department_ids: [departmentId],
      }],
      custom_fields: {},
    }, actor);

    expect(findWeights).toHaveBeenCalledWith({
      where: { id: { in: [] }, isActive: true },
    });
    const updateData = updateScope.mock.calls[0][0].data;
    expect(updateData).not.toHaveProperty('weightDefinitionId');
    expect(updateData).not.toHaveProperty('weightSnapshotName');
    expect(updateData).not.toHaveProperty('weightSnapshotValue');
  });

  it('creates a card from the nearest previous card and copies only effective involved departments', async () => {
    const create = vi.fn(async ({ data }) => ({ id: 'card-new', revision: 1, ...data, departments: [] }));
    const tx: any = {
      initiativeYear: {
        findUnique: vi.fn(async () => ({
          id: 'year',
          year: 2027,
          preparationStage: { managerId: 'prep-manager', priorityId: 'prep-priority', departments: [{ departmentId: 'prep-dept' }] },
          quarterCards: [{
            managerId: 'previous-manager',
            priorityId: 'previous-priority',
            departments: [{ departmentId: 'involved' }, { departmentId: 'executor' }],
            scopeItems: [{ executors: [{ departmentId: 'executor' }] }],
          }],
        })),
      },
      quarterCard: { findUnique: vi.fn(async () => null), create },
      initiativeStatus: { findUnique: vi.fn(async () => ({ id: 'default-status', isActive: true })) },
      auditEvent: { create: vi.fn(async () => ({})) },
    };
    const prisma: any = {
      rolePermission: { findUnique: vi.fn(async () => ({ isReadOnly: false, canCreateEditInitiatives: true })) },
      $transaction: (callback: (client: any) => unknown) => callback(tx),
    };

    await new InitiativesService(prisma).createQuarterCard('year', { quarter: 'Q2' }, actor);

    expect(create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({
        managerId: 'previous-manager',
        priorityId: 'previous-priority',
        departments: { createMany: { data: [{ departmentId: 'involved' }] } },
      }),
    }));
  });

  it('copies a non-green scope item with the same lineage and resets status and weight', async () => {
    const scopeCreate = vi.fn(async () => ({ id: 'copy' }));
    const source = {
      id: 'source-card',
      revision: 3,
      managerId: null,
      priorityId: null,
      initiativeYearId: 'source-year',
      initiativeYear: { year: 2027, initiativeId: 'initiative', initiative: { id: 'initiative' } },
      departments: [{ departmentId: 'dept-a' }],
      customFieldValues: [],
      scopeItems: [{
        id: 'scope-source',
        lineageId: '00000000-0000-4000-8000-000000000010',
        text: 'Scope',
        statusCode: 'YELLOW',
        revision: 2,
        executors: [{ departmentId: 'dept-b' }],
      }],
    };
    const target = { id: 'target-card', revision: 5, createdAt: new Date(), updatedAt: new Date(), departments: [{ departmentId: 'dept-a' }] };
    const tx: any = {
      quarterCard: {
        findUnique: vi.fn(async (args: any) => args.where.id ? source : target),
        findMany: vi.fn(async () => []),
        updateMany: vi.fn(async () => ({ count: 1 })),
        update: vi.fn(async () => ({})),
      },
      initiativeYear: { findUnique: vi.fn(async () => ({ id: 'target-year' })) },
      scopeItem: {
        findUnique: vi.fn(async () => null),
        create: scopeCreate,
        findMany: vi.fn(async () => []),
        updateMany: vi.fn(async () => ({ count: 1 })),
      },
      taskWeight: { findFirst: vi.fn(async () => ({ id: 'default-weight', name: 'Не визначено', weight: 0 })) },
      quarterCardDepartment: {
        deleteMany: vi.fn(async () => ({})),
        findMany: vi.fn(async () => [{ departmentId: 'dept-a' }]),
        createMany: vi.fn(async () => ({})),
      },
      initiativeSize: { findMany: vi.fn(async () => []) },
      department: { findMany: vi.fn(async () => []) },
      auditEvent: { create: vi.fn(async () => ({})) },
    };
    const prisma: any = {
      rolePermission: { findUnique: vi.fn(async () => ({ isReadOnly: false, canCreateEditInitiatives: true })) },
      $transaction: (callback: (client: any) => unknown) => callback(tx),
    };

    const result = await new InitiativesService(prisma).copyScope('source-card', 'scope-source', {
      revision: 3,
      target_revision: 5,
      to_year: 2027,
      to_quarter: 'Q4',
    }, actor);

    expect(scopeCreate).toHaveBeenCalledWith({
      data: expect.objectContaining({
        lineageId: source.scopeItems[0].lineageId,
        copiedFromItemId: 'scope-source',
        statusCode: 'DEFAULT',
        weightDefinitionId: 'default-weight',
        weightSnapshotValue: 0,
      }),
    });
    expect(result.data.scope_item_id).toBe('copy');
  });

  it('does not delete a backlog year that contains any quarter card', async () => {
    const tx: any = {
      initiativeYear: { findUnique: vi.fn(async () => ({ id: 'year-old', initiativeId: 'initiative', year: 2025, quarterCards: [{ id: 'card-old', quarter: 1 }] })) },
      quarterCard: {},
    };
    const prisma: any = {
      rolePermission: { findUnique: vi.fn(async () => ({ isReadOnly: false, canDeleteInitiatives: true })) },
      $transaction: (callback: (client: any) => unknown) => callback(tx),
    };
    await expect(new InitiativesService(prisma).removeYear('year-old', 1, actor)).rejects.toMatchObject({ code: 'YEAR_HAS_QUARTER_CARDS' });
  });

  it('does not delete a quarter card with completed scope items', async () => {
    const tx: any = {
      quarterCard: { findUnique: vi.fn(async () => ({
        id: 'card', initiativeYearId: 'year', quarter: 4,
        initiativeYear: { year: 2099 }, scopeItems: [{ statusCode: 'GREEN' }],
      })) },
    };
    const prisma: any = {
      rolePermission: { findUnique: vi.fn(async () => ({ isReadOnly: false, canDeleteInitiatives: true })) },
      $transaction: (callback: (client: any) => unknown) => callback(tx),
    };
    await expect(new InitiativesService(prisma).removeCard('card', 1, actor)).rejects.toMatchObject({ code: 'CARD_HAS_COMPLETED_SCOPE' });
  });
});
