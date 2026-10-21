import { Injectable, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaMssql } from '@prisma/adapter-mssql';
import { PrismaClient } from '../../generated/prisma/client';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleDestroy {
  constructor(config: ConfigService) {
    super({
      adapter: new PrismaMssql(config.getOrThrow<string>('DATABASE_URL'), {
        schema: 'dbo',
        onPoolError: (error) => console.error('MSSQL pool error', error),
      }),
    });
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }
}
