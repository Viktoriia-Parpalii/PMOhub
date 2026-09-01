import { createHash, randomUUID } from "node:crypto";
import { HttpStatus, Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { JwtService } from "@nestjs/jwt";
import * as argon2 from "argon2";
import { PrismaService } from "../../infrastructure/database/prisma.service";
import { AppError } from "../../common/errors/app-error";
import { AuthUser } from "../../common/auth/auth-user";

const normalizeEmail = (email: string) =>
  email.trim().toLocaleLowerCase("uk-UA");
const digest = (token: string) =>
  createHash("sha256").update(token).digest("hex");
const ttlSeconds = (value: string): number => {
  const match = /^(\d+)(s|m|h|d)?$/.exec(value.trim());
  if (!match) return 900;
  const amount = Number(match[1]);
  return amount * ({ s: 1, m: 60, h: 3600, d: 86400 }[match[2] ?? "s"] ?? 1);
};

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
  ) {}

  async login(email: string, password: string, userAgent?: string) {
    const user = await this.prisma.user.findUnique({
      where: { normalizedEmail: normalizeEmail(email) },
    });
    if (!user?.isActive)
      throw new AppError(
        "INVALID_CREDENTIALS",
        "Невірний email або пароль",
        HttpStatus.UNAUTHORIZED,
      );
    if (!user.passwordHash)
      throw new AppError(
        "PASSWORD_NOT_SET",
        "Для цього облікового запису не задано пароль. Зверніться до адміністратора.",
        HttpStatus.CONFLICT,
      );
    if (!(await argon2.verify(user.passwordHash, password)))
      throw new AppError(
        "INVALID_CREDENTIALS",
        "Невірний email або пароль",
        HttpStatus.UNAUTHORIZED,
      );
    return this.issueSession(user, userAgent);
  }

  async refresh(refreshToken: string | undefined, userAgent?: string) {
    if (!refreshToken)
      throw new AppError(
        "REFRESH_REQUIRED",
        "Токен оновлення сесії відсутній",
        HttpStatus.UNAUTHORIZED,
      );
    let payload: { sub: string; jti: string; type: string };
    try {
      payload = await this.jwt.verifyAsync(refreshToken, {
        secret: this.config.getOrThrow("JWT_REFRESH_SECRET"),
      });
    } catch {
      throw new AppError(
        "INVALID_REFRESH_TOKEN",
        "Токен оновлення сесії недійсний",
        HttpStatus.UNAUTHORIZED,
      );
    }
    if (payload.type !== "refresh")
      throw new AppError(
        "INVALID_REFRESH_TOKEN",
        "Токен оновлення сесії недійсний",
        HttpStatus.UNAUTHORIZED,
      );
    const stored = await this.prisma.refreshToken.findUnique({
      where: { tokenHash: digest(refreshToken) },
      include: { user: true },
    });
    if (stored?.revokedAt) {
      await this.prisma.refreshToken.updateMany({
        where: { userId: stored.userId, revokedAt: null },
        data: { revokedAt: new Date() },
      });
      throw new AppError(
        "REFRESH_TOKEN_REUSE",
        "Сесію відкликано через повторне використання токена оновлення",
        HttpStatus.UNAUTHORIZED,
      );
    }
    if (!stored || stored.expiresAt <= new Date() || !stored.user.isActive) {
      throw new AppError(
        "INVALID_REFRESH_TOKEN",
        "Токен оновлення сесії недійсний",
        HttpStatus.UNAUTHORIZED,
      );
    }
    return this.issueSession(stored.user, userAgent, stored.id);
  }

  async logout(refreshToken?: string) {
    if (refreshToken)
      await this.prisma.refreshToken.updateMany({
        where: { tokenHash: digest(refreshToken), revokedAt: null },
        data: { revokedAt: new Date() },
      });
    return { success: true, message: "Вихід виконано" };
  }

  async changePassword(
    authUser: AuthUser,
    currentPassword: string | undefined,
    newPassword: string,
    userAgent?: string,
  ) {
    const user = await this.prisma.user.findUnique({
      where: { id: authUser.id },
    });
    if (!user?.passwordHash) {
      throw new AppError(
        "INVALID_CURRENT_PASSWORD",
        "Невірний поточний пароль",
        HttpStatus.UNAUTHORIZED,
      );
    }
    if (user.mustChangePassword) {
      if (!authUser.password_change_authorized) {
        throw new AppError(
          "PASSWORD_CHANGE_REAUTH_REQUIRED",
          "Увійдіть повторно за тимчасовим паролем",
          HttpStatus.UNAUTHORIZED,
        );
      }
    } else if (
      !currentPassword ||
      !(await argon2.verify(user.passwordHash, currentPassword))
    ) {
      throw new AppError(
        "INVALID_CURRENT_PASSWORD",
        "Невірний поточний пароль",
        HttpStatus.UNAUTHORIZED,
      );
    }
    const updated = await this.prisma.$transaction([
      this.prisma.user.update({
        where: { id: user.id },
        data: {
          passwordHash: await argon2.hash(newPassword, {
            type: argon2.argon2id,
          }),
          mustChangePassword: false,
        },
      }),
      this.prisma.refreshToken.updateMany({
        where: { userId: user.id, revokedAt: null },
        data: { revokedAt: new Date() },
      }),
    ]);
    return this.issueSession(updated[0], userAgent);
  }

  private async issueSession(
    user: {
      id: string;
      name: string;
      email: string;
      role: string;
      departmentId: string | null;
      mustChangePassword: boolean;
    },
    userAgent?: string,
    replacedTokenId?: string,
  ) {
    const accessTtl = this.config.get<string>("ACCESS_TOKEN_TTL") ?? "15m";
    const accessToken = await this.jwt.signAsync(
      {
        sub: user.id,
        role: user.role,
        must_change_password: user.mustChangePassword,
        type: "access",
      },
      {
        secret: this.config.getOrThrow("JWT_ACCESS_SECRET"),
        expiresIn: accessTtl as never,
      },
    );
    const refreshId = randomUUID();
    const refreshDays = this.config.get<number>("REFRESH_TOKEN_DAYS", 7);
    const expiresAt = new Date(Date.now() + refreshDays * 86_400_000);
    const refreshToken = await this.jwt.signAsync(
      { sub: user.id, jti: refreshId, type: "refresh" },
      {
        secret: this.config.getOrThrow("JWT_REFRESH_SECRET"),
        expiresIn: `${refreshDays}d` as never,
      },
    );
    await this.prisma.$transaction(async (tx) => {
      if (replacedTokenId)
        await tx.refreshToken.update({
          where: { id: replacedTokenId },
          data: { revokedAt: new Date(), replacedBy: refreshId },
        });
      await tx.refreshToken.create({
        data: {
          id: refreshId,
          userId: user.id,
          tokenHash: digest(refreshToken),
          expiresAt,
          userAgent,
        },
      });
    });
    return {
      access_token: accessToken,
      refresh_token: refreshToken,
      expires_in: ttlSeconds(accessTtl),
      user: this.toPublicUser(user),
    };
  }

  private toPublicUser(user: {
    id: string;
    name: string;
    email: string;
    role: string;
    departmentId: string | null;
    mustChangePassword: boolean;
  }) {
    return {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      department_id: user.departmentId ?? undefined,
      must_change_password: user.mustChangePassword,
    };
  }
}
