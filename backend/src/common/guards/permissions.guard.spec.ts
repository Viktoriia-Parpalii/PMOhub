import { describe, expect, it, vi } from 'vitest';
import { PermissionsGuard } from './permissions.guard';
import { PERMISSIONS_KEY, ROLES_KEY } from '../decorators/permissions.decorator';

const context = (role: 'SUPER_ADMIN' | 'ADMIN' | 'USER') => ({
  getHandler: () => undefined,
  getClass: () => undefined,
  switchToHttp: () => ({ getRequest: () => ({ user: { id: 'user', name: 'User', email: 'u@example.com', role } }) }),
}) as any;

describe('PermissionsGuard security invariants', () => {
  it('rejects a read-only role even when the requested flag is true', async () => {
    const reflector = { getAllAndOverride: vi.fn((key) => key === PERMISSIONS_KEY ? ['canAccessAdmin'] : undefined) };
    const prisma = { rolePermission: { findUnique: vi.fn(async () => ({ canAccessAdmin: true, isReadOnly: true })) } };
    const guard = new PermissionsGuard(reflector as any, prisma as any);
    await expect(guard.canActivate(context('ADMIN'))).rejects.toMatchObject({ status: 403 });
  });

  it('rejects ADMIN from a SUPER_ADMIN-only endpoint', async () => {
    const reflector = { getAllAndOverride: vi.fn((key) => key === ROLES_KEY ? ['SUPER_ADMIN'] : key === PERMISSIONS_KEY ? ['canAccessAdmin'] : undefined) };
    const guard = new PermissionsGuard(reflector as any, {} as any);
    await expect(guard.canActivate(context('ADMIN'))).rejects.toMatchObject({ status: 403 });
  });
});
