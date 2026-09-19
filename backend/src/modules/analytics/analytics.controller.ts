import { Controller, Get, Query } from "@nestjs/common";
import { ApiBearerAuth, ApiOkResponse, ApiTags } from "@nestjs/swagger";
import { AnalyticsService } from "./analytics.service";
import {
  AnalyticsDataResponseDto,
  AnalyticsDrilldownDto,
  AnalyticsDrilldownResponseDto,
  AnalyticsFilterDto,
  QuarterlyAnalyticsFilterDto,
} from "./analytics.dto";

@ApiTags("analytics")
@ApiBearerAuth()
@Controller("analytics")
export class AnalyticsController {
  constructor(private readonly analytics: AnalyticsService) {}

  @Get("quarterly/overview")
  @ApiOkResponse({ type: AnalyticsDataResponseDto })
  async quarterlyOverview(@Query() query: QuarterlyAnalyticsFilterDto) {
    return { success: true, data: await this.analytics.quarterlyOverview(query) };
  }

  @Get("quarterly/workload")
  @ApiOkResponse({ type: AnalyticsDataResponseDto })
  async quarterlyWorkload(@Query() query: QuarterlyAnalyticsFilterDto) {
    return { success: true, data: await this.analytics.quarterlyWorkload(query) };
  }

  @Get("quarterly/trends")
  @ApiOkResponse({ type: AnalyticsDataResponseDto })
  async quarterlyTrends(@Query() query: QuarterlyAnalyticsFilterDto) {
    return { success: true, data: await this.analytics.quarterlyTrends(query) };
  }

  @Get("quarterly/planning-health")
  @ApiOkResponse({ type: AnalyticsDataResponseDto })
  async quarterlyPlanningHealth(@Query() query: QuarterlyAnalyticsFilterDto) {
    return { success: true, data: await this.analytics.quarterlyPlanningHealth(query) };
  }

  @Get("annual/overview")
  @ApiOkResponse({ type: AnalyticsDataResponseDto })
  async annualOverview(@Query() query: AnalyticsFilterDto) {
    return { success: true, data: await this.analytics.annualOverview(query) };
  }

  @Get("annual/workload")
  @ApiOkResponse({ type: AnalyticsDataResponseDto })
  async annualWorkload(@Query() query: AnalyticsFilterDto) {
    return { success: true, data: await this.analytics.annualWorkload(query) };
  }

  @Get("annual/trends")
  @ApiOkResponse({ type: AnalyticsDataResponseDto })
  async annualTrends(@Query() query: AnalyticsFilterDto) {
    return { success: true, data: await this.analytics.annualTrends(query) };
  }

  @Get("annual/planning-health")
  @ApiOkResponse({ type: AnalyticsDataResponseDto })
  async annualPlanningHealth(@Query() query: AnalyticsFilterDto) {
    return { success: true, data: await this.analytics.annualPlanningHealth(query) };
  }

  @Get("drilldown")
  @ApiOkResponse({ type: AnalyticsDrilldownResponseDto })
  async drilldown(@Query() query: AnalyticsDrilldownDto) {
    return { success: true, data: await this.analytics.drilldown(query) };
  }
}
