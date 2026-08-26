import { lastValueFrom, of } from 'rxjs';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { AdminMutationAuditInterceptor, auditAggregateId } from './admin-mutation-audit.interceptor';

describe('AdminMutationAuditInterceptor', () => {
  afterEach(() => vi.restoreAllMocks());

  it('always maps an administrative route to a SQL uniqueidentifier', () => {
    expect(auditAggregateId('/api/v1/dictionaries/departments')).toMatch(/^[0-9a-f-]{36}$/);
    expect(auditAggregateId('/api/v1/role-permissions/ADMIN')).toBe(auditAggregateId('/api/v1/role-permissions/ADMIN?x=1'));
  });

  it('does not turn an already committed command into a false failure when audit storage is unavailable', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const prisma = { auditEvent: { create: vi.fn(async () => { throw new Error('audit unavailable'); }) } };
    const interceptor = new AdminMutationAuditInterceptor(prisma as any);
    const context = { switchToHttp: () => ({ getRequest: () => ({ method: 'POST', originalUrl: '/api/v1/dictionaries/departments', user: { id: '00000000-0000-4000-8000-000000000001', name: 'Admin' } }) }) } as any;
    const response = { success: true, data: { id: 'created' } };
    await expect(lastValueFrom(interceptor.intercept(context, { handle: () => of(response) } as any))).resolves.toEqual(response);
  });
});
