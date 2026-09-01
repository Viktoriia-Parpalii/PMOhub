import { beforeEach, describe, expect, it, vi } from "vitest";
import * as argon2 from "argon2";
import { AuthService } from "./auth.service";

vi.mock("argon2", () => ({
  argon2id: 2,
  hash: vi.fn(async () => "new-password-hash"),
  verify: vi.fn(async () => true),
}));

const user = {
  id: "00000000-0000-4000-8000-000000000010",
  name: "Temporary User",
  email: "temporary@example.com",
  role: "USER",
  departmentId: null,
  passwordHash: "temporary-password-hash",
  isActive: true,
  mustChangePassword: true,
};

const createService = (storedUser = user) => {
  const tx = {
    refreshToken: {
      create: vi.fn(async () => ({})),
      update: vi.fn(async () => ({})),
    },
  };
  const prisma: any = {
    user: {
      findUnique: vi.fn(async () => storedUser),
      update: vi.fn(async () => ({
        ...storedUser,
        passwordHash: "new-password-hash",
        mustChangePassword: false,
      })),
    },
    refreshToken: { updateMany: vi.fn(async () => ({ count: 1 })) },
    $transaction: vi.fn(async (input: unknown) =>
      Array.isArray(input) ? Promise.all(input) : (input as (client: typeof tx) => unknown)(tx),
    ),
  };
  const jwt: any = {
    signAsync: vi
      .fn()
      .mockResolvedValueOnce("new-access-token")
      .mockResolvedValueOnce("new-refresh-token"),
  };
  const config: any = {
    get: vi.fn((key: string, fallback?: unknown) =>
      key === "ACCESS_TOKEN_TTL"
        ? "15m"
        : key === "REFRESH_TOKEN_DAYS"
          ? 7
          : fallback,
    ),
    getOrThrow: vi.fn((key: string) => key),
  };
  return { service: new AuthService(prisma, jwt, config), prisma };
};

describe("AuthService forced password change", () => {
  beforeEach(() => vi.clearAllMocks());

  it("does not require the temporary password again for an authorized login session", async () => {
    const { service, prisma } = createService();

    const result = await service.changePassword(
      {
        id: user.id,
        name: user.name,
        email: user.email,
        role: "USER",
        must_change_password: true,
        password_change_authorized: true,
      },
      undefined,
      "New-secure-password-123",
    );

    expect(argon2.verify).not.toHaveBeenCalled();
    expect(prisma.user.update).toHaveBeenCalledWith({
      where: { id: user.id },
      data: expect.objectContaining({ mustChangePassword: false }),
    });
    expect(result.user.must_change_password).toBe(false);
  });

  it("rejects a stale access token that was not issued for forced password change", async () => {
    const { service } = createService();

    await expect(
      service.changePassword(
        {
          id: user.id,
          name: user.name,
          email: user.email,
          role: "USER",
          must_change_password: true,
          password_change_authorized: false,
        },
        undefined,
        "New-secure-password-123",
      ),
    ).rejects.toMatchObject({
      code: "PASSWORD_CHANGE_REAUTH_REQUIRED",
      status: 401,
    });
  });

  it("still requires the current password for an ordinary profile change", async () => {
    const regularUser = { ...user, mustChangePassword: false };
    const { service } = createService(regularUser);

    await expect(
      service.changePassword(
        {
          id: regularUser.id,
          name: regularUser.name,
          email: regularUser.email,
          role: "USER",
          must_change_password: false,
        },
        undefined,
        "New-secure-password-123",
      ),
    ).rejects.toMatchObject({ code: "INVALID_CURRENT_PASSWORD", status: 401 });
  });
});
