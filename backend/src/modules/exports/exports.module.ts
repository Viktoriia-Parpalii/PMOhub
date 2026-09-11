import { Module } from "@nestjs/common";
import { DatabaseSnapshotQueryService } from "./database-snapshot-query.service";
import { ExcelWorkbookBuilder } from "./excel-workbook.builder";
import { ExportAuditService } from "./export-audit.service";
import { ExportAuthorizationService } from "./export-authorization.service";
import { ExportSummaryService } from "./export-summary.service";
import { ExportsController } from "./exports.controller";
import { ExportsService } from "./exports.service";
import { HtmlToExcelRichTextConverter } from "./html-to-excel-rich-text.converter";
import { InitiativeExportQueryService } from "./initiative-export-query.service";
import { JsonExportSerializer } from "./json-export.serializer";

@Module({
  controllers: [ExportsController],
  providers: [
    ExportsService,
    ExportAuthorizationService,
    InitiativeExportQueryService,
    DatabaseSnapshotQueryService,
    ExportSummaryService,
    ExcelWorkbookBuilder,
    HtmlToExcelRichTextConverter,
    JsonExportSerializer,
    ExportAuditService,
  ],
})
export class ExportsModule {}
