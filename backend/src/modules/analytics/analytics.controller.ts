import { Controller, Get, Query } from "@nestjs/common";
import { ApiBearerAuth, ApiOkResponse, ApiTags } from "@nestjs/swagger";
import { AnalyticsService } from "./analytics.service";
import {
  AnalyticsDrilldownDto,
  AnalyticsDrilldownResponseDto,
  AnalyticsFilterDto,
  AnalyticsSummaryResponseDto,
  QuarterlyAnalyticsFilterDto,
} from "./analytics.dto";

@ApiTags("analytics")
@ApiBearerAuth()
@Controller("analytics")
export class AnalyticsController {
  constructor(private readonly analytics: AnalyticsService) {}
  @Get("quarterly/summary")
  @ApiOkResponse({ type: AnalyticsSummaryResponseDto })
  async quarterly(@Query() query: QuarterlyAnalyticsFilterDto) {
    return { success: true, data: await this.analytics.quarterly(query) };
  }

  @Get("annual/summary")
  @ApiOkResponse({ type: AnalyticsSummaryResponseDto })
  async annual(@Query() query: AnalyticsFilterDto) {
    return { success: true, data: await this.analytics.annual(query) };
  }

  @Get("drilldown")
  @ApiOkResponse({ type: AnalyticsDrilldownResponseDto })
  async drilldown(@Query() query: AnalyticsDrilldownDto) {
    return { success: true, data: await this.analytics.drilldown(query) };
  }
}
