import { Controller, Get, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { AnalyticsService } from './analytics.service';

@ApiTags('analytics') @ApiBearerAuth() @Controller('analytics')
export class AnalyticsController {
  constructor(private readonly analytics: AnalyticsService) {}
  @Get() get(@Query('year') year?: string, @Query('quarter') quarter?: 'Q1' | 'Q2' | 'Q3' | 'Q4') { return this.analytics.get(year ? Number(year) : undefined, quarter); }
}
