import { Controller, Get, Param, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { PrismaService } from '../../infrastructure/database/prisma.service';

@ApiTags('audit') @ApiBearerAuth() @Controller('audit')
export class AuditController {
  constructor(private readonly prisma: PrismaService) {}
  @Get(':aggregateType/:aggregateId')
  async list(@Param('aggregateType') aggregateType: string, @Param('aggregateId') aggregateId: string, @Query('take') rawTake?: string) {
    const take = Math.min(Math.max(Number(rawTake) || 100, 1), 500);
    const events = await this.prisma.auditEvent.findMany({ where: { aggregateType, aggregateId }, orderBy: { occurredAt: 'desc' }, take });
    return events.map((event) => ({ id: event.id, date: event.occurredAt.toISOString(), author: event.actorName, action: event.message, code: event.actionCode }));
  }
}
