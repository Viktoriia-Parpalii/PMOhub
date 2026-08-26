import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from '@nestjs/common';
import { createHash } from 'node:crypto';
import { from, Observable, of } from 'rxjs';
import { catchError, mergeMap, map } from 'rxjs/operators';
import { PrismaService } from '../../infrastructure/database/prisma.service';
import { AuthUser } from '../auth/auth-user';

const UUID_PATTERN = /[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}/i;

/** AuditEvent.aggregateId is a SQL Server uniqueidentifier, never an arbitrary URL. */
export const auditAggregateId = (url: string) => {
  const existing = url.match(UUID_PATTERN)?.[0];
  if (existing) return existing.toLowerCase();
  const bytes = createHash('sha256').update(`ADMIN_CONFIGURATION:${url.split('?')[0]}`).digest().subarray(0, 16);
  bytes[6] = (bytes[6] & 0x0f) | 0x50;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  const hex = bytes.toString('hex');
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
};

@Injectable()
export class AdminMutationAuditInterceptor implements NestInterceptor {
  constructor(private readonly prisma: PrismaService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const request = context.switchToHttp().getRequest<{ method: string; originalUrl: string; user?: AuthUser }>();
    const audited = ['users', 'dictionaries', 'custom-fields', 'role-permissions'].some((segment) => request.originalUrl.includes(`/api/v1/${segment}`));
    if (!audited || request.method === 'GET') return next.handle();
    return next.handle().pipe(mergeMap((response) => {
      if (!request.user) return of(response);
      return from(this.prisma.auditEvent.create({ data: {
        aggregateType: 'ADMIN_CONFIGURATION', aggregateId: auditAggregateId(request.originalUrl),
        actionCode: `${request.method}_ADMIN_CONFIGURATION`, message: `${request.method} ${request.originalUrl}`,
        actorUserId: request.user.id, actorName: request.user.name,
      } })).pipe(
        map(() => response),
        // The business command has already committed. A secondary audit outage
        // must be reported to logs/monitoring, not converted into a false 500.
        catchError((error) => { console.error('Admin mutation audit failed', error); return of(response); }),
      );
    }));
  }
}
