import { Injectable } from "@nestjs/common";
import { AuthUser } from "../../common/auth/auth-user";
import {
  AiJsonExportDto,
  ExcelExportDto,
  ExportAvailabilityQueryDto,
  InitiativeExportFilterDto,
} from "./export.dto";
import { DatabaseSnapshotQueryService } from "./database-snapshot-query.service";
import { ExcelWorkbookBuilder } from "./excel-workbook.builder";
import { ExportAuditService } from "./export-audit.service";
import { ExportAuthorizationService } from "./export-authorization.service";
import { InitiativeExportQueryService } from "./initiative-export-query.service";
import { JsonExportSerializer } from "./json-export.serializer";

@Injectable()
export class ExportsService {
  constructor(
    private readonly authorization: ExportAuthorizationService,
    private readonly initiatives: InitiativeExportQueryService,
    private readonly snapshots: DatabaseSnapshotQueryService,
    private readonly excel: ExcelWorkbookBuilder,
    private readonly json: JsonExportSerializer,
    private readonly audit: ExportAuditService,
  ) {}

  async availability(actor: AuthUser, query: ExportAvailabilityQueryDto) {
    await this.authorization.assertAdmin(actor);
    return this.initiatives.availability(query);
  }

  async preview(actor: AuthUser, filter: InitiativeExportFilterDto) {
    await this.authorization.assertAdmin(actor);
    return this.initiatives.preview(filter);
  }

  async buildExcel(actor: AuthUser, filter: ExcelExportDto) {
    await this.authorization.assertAdmin(actor);
    try {
      const dataset = await this.initiatives.load(filter);
      const buffer = await this.excel.build(dataset, filter, actor);
      await this.audit.write(actor, "EXCEL", "SUCCESS", {
        records: dataset.years.length + dataset.cards.length,
        filters: filter,
      });
      return buffer;
    } catch (error) {
      await this.safeFailureAudit(actor, "EXCEL", filter, error);
      throw error;
    }
  }

  async buildAiJson(actor: AuthUser, request: AiJsonExportDto) {
    await this.authorization.assertAdmin(actor);
    try {
      const dataset = await this.initiatives.load(request);
      const value = this.json.ai(dataset, request, actor);
      await this.audit.write(actor, "AI_JSON", "SUCCESS", {
        records: dataset.years.length + dataset.cards.length,
        filters: { years: request.years, periods: request.periods, kinds: request.kinds },
        privacy: request.privacy,
      });
      return Buffer.from(JSON.stringify(value, null, 2), "utf8");
    } catch (error) {
      await this.safeFailureAudit(actor, "AI_JSON", request, error);
      throw error;
    }
  }

  async buildFullJson(actor: AuthUser) {
    this.authorization.assertSuperAdmin(actor);
    try {
      const data = await this.snapshots.load();
      const value = this.json.full(data, actor);
      const records = Object.values(data).reduce((sum, rows) => sum + rows.length, 0);
      await this.audit.write(actor, "FULL_JSON", "SUCCESS", { records });
      return Buffer.from(JSON.stringify(value, null, 2), "utf8");
    } catch (error) {
      await this.safeFailureAudit(actor, "FULL_JSON", undefined, error);
      throw error;
    }
  }

  private async safeFailureAudit(
    actor: AuthUser,
    format: "EXCEL" | "AI_JSON" | "FULL_JSON",
    filters: unknown,
    error: unknown,
  ) {
    try {
      await this.audit.write(actor, format, "FAILED", {
        filters,
        error: error instanceof Error ? error.message : "Невідома помилка",
      });
    } catch {
      // Audit failure must not replace the original export error.
    }
  }
}
