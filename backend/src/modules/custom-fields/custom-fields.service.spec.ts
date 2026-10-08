import { describe, expect, it, vi } from 'vitest';
import { CustomFieldsService } from './custom-fields.service';

describe('CustomFieldsService', () => {
  it('deactivates an option already used by a card and preserves its id', async () => {
    const current = {
      id: 'field-1', entityType: 'project', name: 'Стан', fieldType: 'SELECT',
      isRequired: false, showInTable: true, showInCards: true, isActive: true,
      options: [
        { id: 'option-used', value: 'Старий', sortOrder: 0, isActive: true },
        { id: 'option-kept', value: 'Актуальний', sortOrder: 1, isActive: true },
      ],
    };
    const optionUpdate = vi.fn(async () => undefined);
    const tx = {
      customFieldDefinition: {
        findUnique: vi.fn(async () => current),
        update: vi.fn(async () => ({ ...current, options: [{ ...current.options[1], sortOrder: 0 }] })),
      },
      customFieldValue: {
        count: vi.fn(async (args: { where: { optionValue?: string } }) => args.where.optionValue === 'Старий' ? 1 : 1),
      },
      customFieldOption: { update: optionUpdate, delete: vi.fn(), create: vi.fn() },
      auditEvent: { create: vi.fn() },
    };
    const prisma = {
      rolePermission: { findUnique: vi.fn(async () => ({ canAccessAdmin: true, isReadOnly: false })) },
      $transaction: vi.fn(async (callback: (client: typeof tx) => unknown) => callback(tx)),
    };
    const service = new CustomFieldsService(prisma as never);

    await service.update('field-1', {
      entityType: 'project', name: 'Стан', type: 'SELECT', isRequired: false,
      options: ['Актуальний'], showInTable: true, showInCards: true, isActive: true,
    }, { id: 'admin', name: 'Admin', email: 'admin@example.com', role: 'SUPER_ADMIN', must_change_password: false });

    expect(optionUpdate).toHaveBeenCalledWith({
      where: { id: 'option-used' },
      data: { isActive: false, sortOrder: 200000 },
    });
    expect(tx.customFieldOption.delete).not.toHaveBeenCalledWith({ where: { id: 'option-used' } });
    expect(tx.auditEvent.create).toHaveBeenCalledOnce();
  });
});
