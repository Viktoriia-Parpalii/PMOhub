import { HttpStatus, Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { AppError } from "../../common/errors/app-error";
import { Prisma } from "../../generated/prisma/client";
import { PrismaService } from "../../infrastructure/database/prisma.service";

export type DatabaseSnapshotData = Awaited<ReturnType<DatabaseSnapshotQueryService["load"]>>;

@Injectable()
export class DatabaseSnapshotQueryService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
  ) {}

  async load() {
    const data = await this.prisma.$transaction(
      async (tx) => ({
        users: await tx.user.findMany({
          select: {
            id: true,
            name: true,
            email: true,
            normalizedEmail: true,
            role: true,
            departmentId: true,
            isActive: true,
            mustChangePassword: true,
            createdAt: true,
            updatedAt: true,
          },
          orderBy: { createdAt: "asc" },
        }),
        role_permissions: await tx.rolePermission.findMany({ orderBy: { role: "asc" } }),
        departments: await tx.department.findMany({ orderBy: { createdAt: "asc" } }),
        managers: await tx.manager.findMany({ orderBy: { createdAt: "asc" } }),
        priorities: await tx.priority.findMany({ orderBy: { createdAt: "asc" } }),
        card_status_definitions: await tx.initiativeStatus.findMany({ orderBy: { createdAt: "asc" } }),
        task_weight_definitions: await tx.taskWeight.findMany({ orderBy: { createdAt: "asc" } }),
        initiative_size_definitions: await tx.initiativeSize.findMany({ orderBy: { createdAt: "asc" } }),
        custom_field_definitions: await tx.customFieldDefinition.findMany({ orderBy: { createdAt: "asc" } }),
        custom_field_options: await tx.customFieldOption.findMany({ orderBy: [{ definitionId: "asc" }, { sortOrder: "asc" }] }),
        initiatives: await tx.initiative.findMany({ orderBy: { createdAt: "asc" } }),
        initiative_years: await tx.initiativeYear.findMany({ orderBy: { createdAt: "asc" } }),
        preparation_stages: await tx.preparationStage.findMany({ orderBy: { createdAt: "asc" } }),
        preparation_stage_departments: await tx.preparationStageDepartment.findMany({ orderBy: [{ initiativeYearId: "asc" }, { departmentId: "asc" }] }),
        quarter_cards: await tx.quarterCard.findMany({ orderBy: { createdAt: "asc" } }),
        quarter_card_departments: await tx.quarterCardDepartment.findMany({ orderBy: [{ quarterCardId: "asc" }, { departmentId: "asc" }] }),
        scope_items: await tx.scopeItem.findMany({ orderBy: { createdAt: "asc" } }),
        scope_item_executors: await tx.scopeItemExecutor.findMany({ orderBy: [{ scopeItemId: "asc" }, { departmentId: "asc" }] }),
        quarter_card_custom_field_values: await tx.customFieldValue.findMany({ orderBy: [{ quarterCardId: "asc" }, { definitionId: "asc" }] }),
        audit_events: await tx.auditEvent.findMany({ orderBy: { occurredAt: "asc" } }),
      }),
      { isolationLevel: Prisma.TransactionIsolationLevel.RepeatableRead, timeout: 90_000 },
    );
    const total = Object.values(data).reduce((sum, rows) => sum + rows.length, 0);
    const limit = this.config.get<number>("EXPORT_MAX_JSON_ROWS", 100_000);
    if (total > limit) {
      throw new AppError(
        "EXPORT_TOO_LARGE",
        `Системний snapshot містить ${total} рядків. Максимально дозволено ${limit}.`,
        HttpStatus.PAYLOAD_TOO_LARGE,
        { count: total, limit },
      );
    }
    return data;
  }
}
