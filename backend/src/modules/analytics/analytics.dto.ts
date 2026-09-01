import { Type } from "class-transformer";
import {
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  Min,
} from "class-validator";
import { ApiProperty } from "@nestjs/swagger";

export class AnalyticsFilterDto {
  @Type(() => Number) @IsInt() @Min(2000) @Max(2200) year!: number;
  @IsOptional() @IsIn(["PROJECT", "OPERATIONAL_TASK"]) kind?:
    | "PROJECT"
    | "OPERATIONAL_TASK";
  @IsOptional() @IsUUID() department_id?: string;
  @IsOptional() @IsUUID() manager_id?: string;
}

export class QuarterlyAnalyticsFilterDto extends AnalyticsFilterDto {
  @IsIn(["Q1", "Q2", "Q3", "Q4"]) quarter!: "Q1" | "Q2" | "Q3" | "Q4";
}

export class AnalyticsDrilldownDto extends AnalyticsFilterDto {
  @IsIn(["quarterly", "annual"]) mode!: "quarterly" | "annual";
  @IsOptional() @IsIn(["Q1", "Q2", "Q3", "Q4"]) quarter?:
    | "Q1"
    | "Q2"
    | "Q3"
    | "Q4";
  @IsOptional() @IsString() card_ids?: string;
  @IsOptional() @IsUUID() status_id?: string;
  @Type(() => Number) @IsInt() @Min(1) page: number = 1;
  @Type(() => Number) @IsInt() @Min(1) @Max(100) page_size: number = 25;
}

export class StatusCountsDto {
  @ApiProperty() GREEN!: number;
  @ApiProperty() YELLOW!: number;
  @ApiProperty() RED!: number;
  @ApiProperty() DEFAULT!: number;
}

export class AnalyticsRecordDto {
  @ApiProperty() id!: string;
  @ApiProperty() initiative_id!: string;
  @ApiProperty({ enum: ["PROJECT", "OPERATIONAL_TASK"] }) kind!: string;
  @ApiProperty() name!: string;
  @ApiProperty() year!: number;
  @ApiProperty({ enum: ["Q1", "Q2", "Q3", "Q4"] }) quarter!: string;
  @ApiProperty({ nullable: true }) manager_id!: string | null;
  @ApiProperty({ nullable: true }) manager_name!: string | null;
  @ApiProperty({ nullable: true }) priority_id!: string | null;
  @ApiProperty({ nullable: true }) priority_name!: string | null;
  @ApiProperty({ type: [String] }) department_ids!: string[];
  @ApiProperty({ format: "uuid" }) status_id!: string;
  @ApiProperty() status_code!: string;
  @ApiProperty() status_name!: string;
  @ApiProperty() status_color!: string;
  @ApiProperty() total_weight!: number;
  @ApiProperty() size_name!: string;
  @ApiProperty() progress!: number;
  @ApiProperty() scope_items!: number;
  @ApiProperty({ type: [String] }) risks!: string[];
}

export class CardStatusMetricDto {
  @ApiProperty({ format: "uuid" }) status_id!: string;
  @ApiProperty() code!: string;
  @ApiProperty() name!: string;
  @ApiProperty() color!: string;
  @ApiProperty() count!: number;
  @ApiProperty({ type: [String] }) card_ids!: string[];
}

export class AnalyticsDrilldownDataDto {
  @ApiProperty({ type: [AnalyticsRecordDto] }) records!: AnalyticsRecordDto[];
  @ApiProperty() page!: number;
  @ApiProperty() page_size!: number;
  @ApiProperty() total!: number;
}

export class AnalyticsDrilldownResponseDto {
  @ApiProperty({ enum: [true] }) success!: true;
  @ApiProperty({ required: false }) message?: string;
  @ApiProperty({ type: AnalyticsDrilldownDataDto })
  data!: AnalyticsDrilldownDataDto;
}

export class AnalyticsSummaryDataDto {
  @ApiProperty({ enum: ["QUARTERLY", "ANNUAL"] }) mode!: string;
  @ApiProperty({ type: [Number] }) available_years!: number[];
  @ApiProperty({ type: Object, additionalProperties: false }) summary!: {
    cards: number;
    initiatives: number;
    total_weight: number;
    average_progress: number;
    average_duration: number;
    overloaded_departments: number;
  };
  @ApiProperty({ type: [CardStatusMetricDto] })
  status_distribution!: CardStatusMetricDto[];
  @ApiProperty({ type: StatusCountsDto }) scope_status_counts!: StatusCountsDto;
  @ApiProperty({ type: [Object] }) size_breakdown!: Array<{
    name: string;
    count: number;
    card_ids: string[];
  }>;
  @ApiProperty({ type: [Object] }) priority_breakdown!: Array<{
    priority_id: string | null;
    name: string;
    total_weight: number;
    card_ids: string[];
  }>;
  @ApiProperty({ type: [Object] }) priority_status_breakdown!: Array<{
    priority_id: string | null;
    name: string;
    card_ids: string[];
    status_counts: Record<string, number>;
  }>;
  @ApiProperty({ type: [Object] }) department_capacity!: Array<{
    department_id: string;
    name: string;
    load: number;
    limit: number;
    reserve: number;
    is_over_capacity: boolean;
  }>;
  @ApiProperty({ type: [Object] }) capacity_by_quarter!: Array<{
    quarter: string;
    departments: unknown[];
  }>;
  @ApiProperty({ type: [Object] }) manager_loads!: Array<{
    manager_id: string;
    name: string;
    load: number;
    card_ids: string[];
  }>;
  @ApiProperty({ type: [Object] }) risks!: Array<{
    id: string;
    name: string;
    risks: string[];
  }>;
  @ApiProperty({ type: [Object] }) quarter_trend!: unknown[];
  @ApiProperty({ type: [Object] }) volume_trend!: unknown[];
  @ApiProperty({ type: [Object] }) period_comparison!: unknown[];
  @ApiProperty({ type: [Object] }) history!: unknown[];
  @ApiProperty({ type: Object }) preparation!: {
    total: number;
    ready: number;
    records: unknown[];
  };
}

export class AnalyticsSummaryResponseDto {
  @ApiProperty({ enum: [true] }) success!: true;
  @ApiProperty({ required: false }) message?: string;
  @ApiProperty({ type: AnalyticsSummaryDataDto })
  data!: AnalyticsSummaryDataDto;
}
