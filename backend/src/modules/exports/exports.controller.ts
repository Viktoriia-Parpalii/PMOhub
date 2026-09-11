import { Body, Controller, Get, Post, Query, Res } from "@nestjs/common";
import {
  ApiBearerAuth,
  ApiOkResponse,
  ApiOperation,
  ApiProduces,
  ApiTags,
} from "@nestjs/swagger";
import type { Response } from "express";
import { AuthUser } from "../../common/auth/auth-user";
import { CurrentUser } from "../../common/decorators/current-user.decorator";
import { RequirePermissions, RequireRoles } from "../../common/decorators/permissions.decorator";
import {
  AiJsonExportDto,
  ExportAvailabilityQueryDto,
  ExportAvailabilityResponseDto,
  ExcelExportDto,
  ExportPreviewResponseDto,
  InitiativeExportFilterDto,
} from "./export.dto";
import { ExportsService } from "./exports.service";

const attachment = (response: Response, filename: string, contentType: string, body: Buffer) => {
  response.setHeader("Content-Type", contentType);
  response.setHeader("Content-Disposition", `attachment; filename*=UTF-8''${encodeURIComponent(filename)}`);
  response.setHeader("Cache-Control", "no-store");
  response.setHeader("Content-Length", body.byteLength);
  response.send(body);
};

const dateStamp = () => new Date().toISOString().slice(0, 10);

@ApiTags("exports")
@ApiBearerAuth()
@Controller("exports")
export class ExportsController {
  constructor(private readonly exportsService: ExportsService) {}

  @Get("availability")
  @RequirePermissions("canAccessAdmin")
  @ApiOkResponse({ type: ExportAvailabilityResponseDto })
  availability(
    @CurrentUser() actor: AuthUser,
    @Query() query: ExportAvailabilityQueryDto,
  ) {
    return this.exportsService.availability(actor, query).then((data) => ({ success: true, data }));
  }

  @Post("preview")
  @RequirePermissions("canAccessAdmin")
  @ApiOkResponse({ type: ExportPreviewResponseDto })
  preview(@CurrentUser() actor: AuthUser, @Body() filter: InitiativeExportFilterDto) {
    return this.exportsService.preview(actor, filter).then((data) => ({ success: true, data }));
  }

  @Post("excel")
  @RequirePermissions("canAccessAdmin")
  @ApiOperation({ summary: "Завантажити Excel-звіт за ініціативами" })
  @ApiProduces("application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")
  @ApiOkResponse({ schema: { type: "string", format: "binary" } })
  async excel(
    @CurrentUser() actor: AuthUser,
    @Body() filter: ExcelExportDto,
    @Res() response: Response,
  ) {
    const body = await this.exportsService.buildExcel(actor, filter);
    attachment(
      response,
      `PMO_Hub_${filter.years.from}-${filter.years.to}_${dateStamp()}.xlsx`,
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      body,
    );
  }

  @Post("json/ai")
  @RequirePermissions("canAccessAdmin")
  @ApiOperation({ summary: "Завантажити приватний JSON для AI" })
  @ApiProduces("application/json")
  @ApiOkResponse({ schema: { type: "string", format: "binary" } })
  async aiJson(
    @CurrentUser() actor: AuthUser,
    @Body() request: AiJsonExportDto,
    @Res() response: Response,
  ) {
    const body = await this.exportsService.buildAiJson(actor, request);
    attachment(response, `PMO_Hub_AI_${dateStamp()}.json`, "application/json; charset=utf-8", body);
  }

  @Post("json/full")
  @RequireRoles("SUPER_ADMIN")
  @ApiOperation({ summary: "Завантажити санітизований snapshot усієї БД" })
  @ApiProduces("application/json")
  @ApiOkResponse({ schema: { type: "string", format: "binary" } })
  async fullJson(@CurrentUser() actor: AuthUser, @Res() response: Response) {
    const body = await this.exportsService.buildFullJson(actor);
    attachment(response, `PMO_Hub_FULL_${dateStamp()}.json`, "application/json; charset=utf-8", body);
  }
}
