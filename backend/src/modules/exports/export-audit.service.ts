import { Injectable } from "@nestjs/common";
import { AuthUser } from "../../common/auth/auth-user";
import { PrismaService } from "../../infrastructure/database/prisma.service";

@Injectable()
export class ExportAuditService {
  constructor(private readonly prisma: PrismaService) {}

  async write(
    actor: AuthUser,
    format: "EXCEL" | "AI_JSON" | "FULL_JSON",
    outcome: "SUCCESS" | "FAILED",
    details: { records?: number; filters?: unknown; privacy?: unknown; error?: string },
  ) {
    const safe = JSON.stringify(details).slice(0, 700);
    await this.prisma.auditEvent.create({
      data: {
        aggregateType: "DATA_EXPORT",
        aggregateId: actor.id,
        actionCode: `EXPORT_${format}_${outcome}`,
        message: `${format}: ${outcome}. ${safe}`.slice(0, 1000),
        actorUserId: actor.id,
        actorName: actor.name,
      },
    });
  }
}
