import { ConfigService } from '@nestjs/config';
import { afterAll, describe, expect, it } from 'vitest';
import { PrismaService } from './prisma.service';

const enabled = process.env.RUN_DB_TESTS === 'true';
const prisma = enabled ? new PrismaService(new ConfigService({ DATABASE_URL: process.env.DATABASE_URL })) : null;

describe.skipIf(!enabled)('MSSQL transaction integration', () => {
  afterAll(async () => { await prisma?.$disconnect(); });

  it('rolls back all writes when a transaction fails', async () => {
    const aggregateId = crypto.randomUUID();
    await expect(prisma!.$transaction(async (tx) => {
      await tx.auditEvent.create({ data: { aggregateType: 'CI_TEST', aggregateId, actionCode: 'ROLLBACK_TEST', message: 'must roll back', actorName: 'CI' } });
      throw new Error('rollback');
    })).rejects.toThrow('rollback');
    expect(await prisma!.auditEvent.count({ where: { aggregateId } })).toBe(0);
  });
});
