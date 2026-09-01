import { Transform, Type } from "class-transformer";
import {
  ArrayNotEmpty,
  IsArray,
  IsBoolean,
  IsIn,
  IsInt,
  IsOptional,
  IsUUID,
  Max,
  Min,
  ValidateNested,
} from "class-validator";
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";

export const EXPORT_PERIODS = ["BACKLOG", "Q1", "Q2", "Q3", "Q4"] as const;
export const EXPORT_KINDS = ["PROJECT", "OPERATIONAL_TASK"] as const;
export type ExportPeriod = (typeof EXPORT_PERIODS)[number];
export type ExportKind = (typeof EXPORT_KINDS)[number];

export class ExportYearRangeDto {
  @ApiProperty({ example: 2026 })
  @Type(() => Number)
  @IsInt()
  @Min(2000)
  @Max(2200)
  from!: number;

  @ApiProperty({ example: 2027 })
  @Type(() => Number)
  @IsInt()
  @Min(2000)
  @Max(2200)
  to!: number;
}

export class InitiativeExportFilterDto {
  @ApiProperty({ type: ExportYearRangeDto })
  @ValidateNested()
  @Type(() => ExportYearRangeDto)
  years!: ExportYearRangeDto;

  @ApiProperty({ enum: EXPORT_PERIODS, isArray: true })
  @IsArray()
  @ArrayNotEmpty()
  @IsIn(EXPORT_PERIODS, { each: true })
  periods!: ExportPeriod[];

  @ApiProperty({ enum: EXPORT_KINDS, isArray: true })
  @IsArray()
  @ArrayNotEmpty()
  @IsIn(EXPORT_KINDS, { each: true })
  kinds!: ExportKind[];
}

export class AiExportPrivacyDto {
  @ApiProperty({ default: true }) @IsBoolean() include_name!: boolean;
  @ApiProperty({ default: false }) @IsBoolean() include_strategic_goal!: boolean;
  @ApiProperty({ default: true }) @IsBoolean() include_manager!: boolean;
  @ApiProperty({ default: true }) @IsBoolean() include_departments!: boolean;
  @ApiProperty({ default: false }) @IsBoolean() include_notes!: boolean;

  @ApiProperty({ type: [String], format: "uuid", default: [] })
  @IsArray()
  @IsUUID("4", { each: true })
  selected_custom_field_ids!: string[];
}

export class AiJsonExportDto extends InitiativeExportFilterDto {
  @ApiProperty({ type: AiExportPrivacyDto })
  @ValidateNested()
  @Type(() => AiExportPrivacyDto)
  privacy!: AiExportPrivacyDto;
}

export class ExportAvailabilityQueryDto {
  @ApiPropertyOptional({ enum: EXPORT_KINDS, isArray: true })
  @IsOptional()
  @Transform(({ value }) => (Array.isArray(value) ? value : value ? [value] : undefined))
  @IsArray()
  @IsIn(EXPORT_KINDS, { each: true })
  kinds?: ExportKind[];

  @ApiPropertyOptional({ default: false })
  @IsOptional()
  @IsBoolean()
  @Transform(({ value }) => value === true || value === "true")
  include_custom_fields?: boolean;
}

export class ExportCustomFieldDto {
  @ApiProperty() id!: string;
  @ApiProperty() name!: string;
  @ApiProperty({ enum: ["project", "task"] }) entity_type!: string;
  @ApiProperty({ enum: ["TEXT", "NUMBER", "SELECT", "CHECKBOX", "RICHTEXT"] })
  field_type!: string;
  @ApiProperty() is_active!: boolean;
}

export class ExportAvailabilityDto {
  @ApiProperty({ type: [Number] }) years!: number[];
  @ApiProperty({ additionalProperties: true }) counts!: Record<string, unknown>;
  @ApiProperty({ type: [ExportCustomFieldDto] }) custom_fields!: ExportCustomFieldDto[];
}

export class ExportPreviewDto {
  @ApiProperty() total!: number;
  @ApiProperty() backlog_records!: number;
  @ApiProperty() quarter_cards!: number;
  @ApiProperty({ additionalProperties: true }) by_year!: Record<string, number>;
  @ApiProperty({ additionalProperties: true }) by_period!: Record<string, number>;
  @ApiProperty({ additionalProperties: true }) by_kind!: Record<string, number>;
  @ApiProperty({ type: () => [ExportPreviewMatrixCellDto] })
  matrix!: ExportPreviewMatrixCellDto[];
}

export class ExportPreviewMatrixCellDto {
  @ApiProperty() year!: number;
  @ApiProperty({ enum: EXPORT_PERIODS }) period!: ExportPeriod;
  @ApiProperty({ enum: EXPORT_KINDS }) kind!: ExportKind;
  @ApiProperty() count!: number;
}

export class ExportAvailabilityResponseDto {
  @ApiProperty({ example: true }) success!: true;
  @ApiProperty({ type: ExportAvailabilityDto }) data!: ExportAvailabilityDto;
}

export class ExportPreviewResponseDto {
  @ApiProperty({ example: true }) success!: true;
  @ApiProperty({ type: ExportPreviewDto }) data!: ExportPreviewDto;
}
