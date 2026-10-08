import { beforeEach, describe, expect, it, vi } from 'vitest';
import * as argon2 from 'argon2';
import { UsersService } from './users.service';

vi.mock('argon2', () => ({
  argon2id: 2,
  hash: vi.fn(async () => 'password-hash'),
}));

const actor = {
  id: '00000000-0000-4000-8000-000000000099',
  name: 'Super Admin',
  email: 'admin@example.com',
  role: 'SUPER_ADMIN',
};

describe('UsersService role integrity', () => {
  beforeEach(() => vi.clearAllMocks());

  it('creates a user with a dynamically configured role', async () => {
    const created = {
      id: '00000000-0000-4000-8000-000000000010',
      name: 'New User',
      email: 'user@example.com',
      role: 'PORTFOLIO_REVIEWER',
      departmentId: null,
      isActive: true,
      mustChangePassword: true,
    };
    const tx: any = {
      role: { findUnique: vi.fn(async () => ({ code: 'PORTFOLIO_REVIEWER', isActive: true, rolePermission: { role: 'PORTFOLIO_REVIEWER' } })) },
      user: { create: vi.fn(async () => created) },
      auditEvent: { create: vi.fn(async () => ({})) },
    };
    const prisma: any = {
      rolePermission: { findUnique: vi.fn(async () => ({ canAccessAdmin: true, isReadOnly: false })) },
      $transaction: vi.fn(async (callback: (client: any) => unknown) => callback(tx)),
    };

    const result = await new UsersService(prisma).create({
      name: ' New User ',
      email: 'User@Example.com',
      role: 'PORTFOLIO_REVIEWER',
    }, actor);

    expect(argon2.hash).toHaveBeenCalledOnce();
    expect(tx.role.findUnique).toHaveBeenCalledWith({
      where: { code: 'PORTFOLIO_REVIEWER' },
      select: { code: true, isActive: true, rolePermission: { select: { role: true } } },
    });
    expect(tx.user.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ name: 'New User', normalizedEmail: 'user@example.com', role: 'PORTFOLIO_REVIEWER' }),
    });
    expect(result.data.user).toMatchObject({ id: created.id, role: 'PORTFOLIO_REVIEWER' });
  });

  it('does not insert a user when permissions for the role are missing', async () => {
    const tx: any = {
      role: { findUnique: vi.fn(async () => null) },
      user: { create: vi.fn() },
    };
    const prisma: any = {
      rolePermission: { findUnique: vi.fn(async () => ({ canAccessAdmin: true, isReadOnly: false })) },
      $transaction: vi.fn(async (callback: (client: any) => unknown) => callback(tx)),
    };

    await expect(new UsersService(prisma).create({
      name: 'New User',
      email: 'user@example.com',
      role: 'USER',
    }, actor)).rejects.toMatchObject({ code: 'ROLE_NOT_CONFIGURED', status: 409 });

    expect(tx.user.create).not.toHaveBeenCalled();
  });

  it('validates the target role before changing an existing user role', async () => {
    const existing = {
      id: '00000000-0000-4000-8000-000000000010',
      name: 'Existing User',
      email: 'user@example.com',
      normalizedEmail: 'user@example.com',
      role: 'USER',
      departmentId: null,
      isActive: true,
      mustChangePassword: false,
    };
    const tx: any = {
      role: { findUnique: vi.fn(async () => ({ code: 'ADMIN', isActive: true, rolePermission: { role: 'ADMIN' } })) },
      user: { update: vi.fn(async ({ data }: any) => ({ ...existing, ...data })) },
      refreshToken: { updateMany: vi.fn(async () => ({ count: 1 })) },
      auditEvent: { create: vi.fn(async () => ({})) },
    };
    const prisma: any = {
      rolePermission: { findUnique: vi.fn(async () => ({ canAccessAdmin: true, isReadOnly: false })) },
      user: { findUnique: vi.fn(async () => existing) },
      $transaction: vi.fn(async (callback: (client: any) => unknown) => callback(tx)),
    };

    const result = await new UsersService(prisma).update(existing.id, { role: 'ADMIN' }, actor);

    expect(tx.role.findUnique).toHaveBeenCalledWith({
      where: { code: 'ADMIN' },
      select: { code: true, isActive: true, rolePermission: { select: { role: true } } },
    });
    expect(tx.user.update).toHaveBeenCalledWith(expect.objectContaining({
      where: { id: existing.id },
      data: expect.objectContaining({ role: 'ADMIN' }),
    }));
    expect(tx.refreshToken.updateMany).toHaveBeenCalledOnce();
    expect(result.data).toMatchObject({ role: 'ADMIN' });
  });

  it('does not issue a temporary password for the current user email', async () => {
    const currentUser = {
      id: '00000000-0000-4000-8000-000000000010',
      name: 'Current Admin',
      email: ' ADMIN@EXAMPLE.COM ',
      role: 'SUPER_ADMIN',
    };
    const prisma: any = {
      rolePermission: {
        findUnique: vi.fn(async () => ({
          canAccessAdmin: true,
          isReadOnly: false,
        })),
      },
      user: { findUnique: vi.fn(async () => currentUser) },
      $transaction: vi.fn(),
    };

    await expect(
      new UsersService(prisma).issueTemporaryPassword(currentUser.id, actor),
    ).rejects.toMatchObject({
      code: 'SELF_TEMPORARY_PASSWORD_FORBIDDEN',
      status: 403,
    });

    expect(argon2.hash).not.toHaveBeenCalled();
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });
});
