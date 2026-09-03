import { Type } from "class-transformer";
import {
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  MaxLength,
  Matches,
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
  @IsOptional() @IsUUID() status_id?: string;
  @IsOptional() @IsUUID() card_id?: string;
  @IsOptional() @IsString() @MaxLength(100) size_name?: string;
  @IsOptional()
  @Matches(/^(NONE|[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12})$/i)
  priority_key?: string;
  @IsOptional()
  @IsIn(["NO_MANAGER", "NO_PRIORITY", "NO_SCOPE", "NO_EXECUTOR"])
  risk?: "NO_MANAGER" | "NO_PRIORITY" | "NO_SCOPE" | "NO_EXECUTOR";
  @IsOptional() @IsIn(["cards", "preparation"]) view?:
    | "cards"
    | "preparation";
  @Type(() => Number) @IsInt() @Min(1) page: number = 1;
  @Type(() => Number) @IsInt() @Min(1) @Max(100) page_size: number = 25;
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
  @ApiProperty() status_id!: string;
  @ApiProperty() status_name!: string;
  @ApiProperty() status_color!: string;
  @ApiProperty() total_weight!: number;
  @ApiProperty() size_name!: string;
  @ApiProperty() progress!: number;
  @ApiProperty() scope_items!: number;
  @ApiProperty({ type: [String] }) risks!: string[];
}

export class AnalyticsDrilldownDataDto {
  @ApiProperty({ type: [AnalyticsRecordDto] }) records!: AnalyticsRecordDto[];
  @ApiProperty() page!: number;
  @ApiProperty() page_size!: number;
  @ApiProperty() total!: number;
}

export class AnalyticsDataResponseDto {
  @ApiProperty({ enum: [true] }) success!: true;
  @ApiProperty({ required: false }) message?: string;
  @ApiProperty({ type: Object }) data!: Record<string, unknown>;
}

export class AnalyticsDrilldownResponseDto {
  @ApiProperty({ enum: [true] }) success!: true;
  @ApiProperty({ required: false }) message?: string;
  @ApiProperty({ type: AnalyticsDrilldownDataDto })
  data!: AnalyticsDrilldownDataDto;
}
