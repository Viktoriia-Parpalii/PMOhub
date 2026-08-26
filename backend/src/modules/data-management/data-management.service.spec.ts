import { describe, expect, it, vi } from 'vitest';
import { DataManagementService } from './data-management.service';

describe('DataManagementService authorization', () => {
  it('rejects backup import for ADMIN before touching data', async () => {
    const service = new DataManagementService({} as any, {} as any, {} as any, {} as any, {} as any, {} as any);
    await expect(service.import({}, 'merge', { id: 'admin', name: 'Admin', email: 'a@example.com', role: 'ADMIN', must_change_password: false }, 'token'))
      .rejects.toMatchObject({ code: 'SUPER_ADMIN_REQUIRED', status: 403 });
  });

  it('binds a short-lived validation token to the payload and mode', async () => {
    const prisma = { auditEvent: { create: vi.fn(async () => undefined) } };
    const config = { getOrThrow: () => 'backup-token-secret-at-least-32-characters' };
    const service = new DataManagementService(prisma as any, {} as any, {} as any, {} as any, {} as any, config as any);
    const backup = {
      version: '6.0', departments: [], managers: [], priorities: [], initiativeStatuses: [], taskWeights: [], initiativeSizes: [],
      projects: [], tasks: [], users: [], rolePermissions: [], customFields: [],
    };
    const result = await service.validate(backup, 'merge', { id: 'root', name: 'Root', email: 'r@example.com', role: 'SUPER_ADMIN', must_change_password: false });
    expect(result.data.validation_token).toContain('.');
    expect(() => (service as any).verifyValidationToken(result.data.validation_token, backup, 'replace')).toThrowError(expect.objectContaining({ code: 'STALE_BACKUP_TOKEN' }));
  });
});
