import { HttpStatus, Injectable, Logger } from "@nestjs/common";
import { AuthUser } from "../../common/auth/auth-user";
import { AppError } from "../../common/errors/app-error";
import { PrismaService } from "../../infrastructure/database/prisma.service";
import { UpdateFilterOptionVisibilityDto } from "./system-settings.dto";
import {
  DEFAULT_FILTER_OPTION_VISIBILITY,
  FILTER_OPTION_VISIBILITY_KEY,
  FilterOptionVisibilitySetting,
  FilterOptionVisibilityValue,
  parseFilterOptionVisibility,
} from "./system-settings.types";

@Injectable()
export class SystemSettingsService {
  private readonly logger = new Logger(SystemSettingsService.name);

  constructor(private readonly prisma: PrismaService) {}

  async getFilterOptionVisibility(): Promise<FilterOptionVisibilitySetting> {
    const row = await this.prisma.systemSetting.findUnique({
      where: { key: FILTER_OPTION_VISIBILITY_KEY },
    });
    if (!row) {
      this.logger.warn(
        `${FILTER_OPTION_VISIBILITY_KEY} is missing; using safe defaults`,
      );
      return { revision: 1, ...DEFAULT_FILTER_OPTION_VISIBILITY };
    }
    const value = parseFilterOptionVisibility(row.valueJson);
    if (!value) {
      this.logger.warn(
        `${FILTER_OPTION_VISIBILITY_KEY} contains invalid JSON; using safe defaults`,
      );
      return { revision: row.revision, ...DEFAULT_FILTER_OPTION_VISIBILITY };
    }
    return { revision: row.revision, ...value };
  }

  async updateFilterOptionVisibility(
    dto: UpdateFilterOptionVisibilityDto,
    actor: AuthUser,
  ): Promise<FilterOptionVisibilitySetting> {
    await this.assertMayAdmin(actor);
    const next: FilterOptionVisibilityValue = {
      analytics: dto.analytics,
      portfolio: dto.portfolio,
      backlog: dto.backlog,
    };

    return this.prisma.$transaction(async (tx) => {
      const current = await tx.systemSetting.findUnique({
        where: { key: FILTER_OPTION_VISIBILITY_KEY },
      });
      const currentValue = current
        ? parseFilterOptionVisibility(current.valueJson) ??
          DEFAULT_FILTER_OPTION_VISIBILITY
        : DEFAULT_FILTER_OPTION_VISIBILITY;

      if (!current) {
        if (dto.revision !== 1) throw this.revisionConflict(1);
        await tx.systemSetting.create({
          data: {
            key: FILTER_OPTION_VISIBILITY_KEY,
            valueJson: JSON.stringify(next),
            revision: 2,
            updatedById: actor.id,
          },
        });
      } else {
        const result = await tx.systemSetting.updateMany({
          where: {
            key: FILTER_OPTION_VISIBILITY_KEY,
            revision: dto.revision,
          },
          data: {
            valueJson: JSON.stringify(next),
            revision: { increment: 1 },
            updatedById: actor.id,
          },
        });
        if (result.count !== 1) {
          const latest = await tx.systemSetting.findUnique({
            where: { key: FILTER_OPTION_VISIBILITY_KEY },
            select: { revision: true },
          });
          throw this.revisionConflict(latest?.revision ?? current.revision);
        }
      }

      const updated = await tx.systemSetting.findUniqueOrThrow({
        where: { key: FILTER_OPTION_VISIBILITY_KEY },
      });
      await tx.auditEvent.create({
        data: {
          aggregateType: "SYSTEM_SETTINGS",
          aggregateId: FILTER_OPTION_VISIBILITY_KEY,
          actionCode: "SYSTEM_SETTINGS_UPDATED",
          message: `Оновлено видимість записів у фільтрах: ${JSON.stringify(currentValue)} → ${JSON.stringify(next)}`,
          actorUserId: actor.id,
          actorName: actor.name,
        },
      });
      return { revision: updated.revision, ...next };
    });
  }

  private async assertMayAdmin(actor: AuthUser) {
    const permission = await this.prisma.rolePermission.findUnique({
      where: { role: actor.role },
      include: { roleDefinition: true },
    });
    if (
      !permission?.canAccessAdmin ||
      permission.roleDefinition?.isActive === false ||
      permission.isReadOnly
    )
      throw new AppError(
        "FORBIDDEN",
        "Недостатньо прав для зміни системних налаштувань",
        HttpStatus.FORBIDDEN,
      );
  }

  private revisionConflict(currentRevision: number) {
    return new AppError(
      "REVISION_CONFLICT",
      "Налаштування вже змінив інший адміністратор. Актуальні дані завантажено повторно.",
      HttpStatus.CONFLICT,
      { current_revision: currentRevision },
    );
  }
}
