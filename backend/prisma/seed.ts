import 'dotenv/config';
import * as argon2 from 'argon2';
import { PrismaMssql } from '@prisma/adapter-mssql';
import { PrismaClient } from '../src/generated/prisma/client';

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) throw new Error('DATABASE_URL is required');

const prisma = new PrismaClient({ adapter: new PrismaMssql(databaseUrl, { schema: 'dbo' }) });

async function main() {
  const email = process.env.BOOTSTRAP_ADMIN_EMAIL?.trim();
  const name = process.env.BOOTSTRAP_ADMIN_NAME?.trim();
  const password = process.env.BOOTSTRAP_ADMIN_PASSWORD;
  const configured = [email, name, password].filter(Boolean).length;
  if (configured !== 0 && configured !== 3) throw new Error('Set all BOOTSTRAP_ADMIN_* variables or none of them');
  if (!email || !name || !password) return;
  if (password.length < 12) throw new Error('BOOTSTRAP_ADMIN_PASSWORD must contain at least 12 characters');

  const normalizedEmail = email.toLocaleLowerCase('uk-UA');
  const existing = await prisma.user.findUnique({ where: { normalizedEmail } });
  if (!existing) {
    await prisma.user.create({
      data: {
        name,
        email,
        normalizedEmail,
        passwordHash: await argon2.hash(password, { type: argon2.argon2id }),
        role: 'SUPER_ADMIN',
        mustChangePassword: false,
      },
    });
  }
}

main().finally(() => prisma.$disconnect());
