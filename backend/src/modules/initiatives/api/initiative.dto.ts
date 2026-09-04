import { Type } from "class-transformer";
import {
  IsArray,
  IsIn,
  IsInt,
  IsNotEmpty,
  IsObject,
  IsOptional,
  IsString,
  Max,
  Min,
  ValidateNested,
} from "class-validator";
import { ApiProperty } from "@nestjs/swagger";
import { IsUniqueIdentifier } from "../../../common/validation/unique-identifier.decorator";

export const QUARTERS = ["Q1", "Q2", "Q3", "Q4"] as const;
export type QuarterDto = (typeof QUARTERS)[number];

export class PreparationInputDto {
  @IsOptional() @IsUniqueIdentifier() manager_id?: string;
  @IsOptional() @IsUniqueIdentifier() priority_id?: string;
  @IsArray() @IsUniqueIdentifier({ each: true }) department_ids: string[] = [];
}

export class UpdateInitiativeDto {
  @IsString() @IsNotEmpty() name!: string;
  @IsInt() @Min(1) revision!: number;
}

export class UpdateInitiativeYearDto {
  @IsOptional() @IsString() strategic_goal?: string;
  @IsInt() @Min(1) revision!: number;
}

export class UpdateBacklogDto {
  @IsString() name!: string;
  @IsOptional() @IsString() strategic_goal?: string;
  @IsInt() @Min(1) initiative_revision!: number;
  @IsInt() @Min(1) year_revision!: number;
}

export class UpdatePreparationDto extends PreparationInputDto {
  @IsInt() @Min(1) revision!: number;
}

export class CreateQuarterCardDto {
  @IsIn(QUARTERS) quarter!: QuarterDto;
}

export class CreateScopeItemDto {
  @IsOptional() @IsUniqueIdentifier() lineage_id?: string;
  @IsString() @IsNotEmpty() text!: string;
  @IsIn(["DEFAULT", "GREEN", "YELLOW", "RED"]) status_code!:
    | "DEFAULT"
    | "GREEN"
    | "YELLOW"
    | "RED";
  @IsUniqueIdentifier() weight_definition_id!: string;
  @IsArray()
  @IsUniqueIdentifier({ each: true })
  executor_department_ids: string[] = [];
}

export class ScopeItemDto extends CreateScopeItemDto {
  @IsOptional() @IsUniqueIdentifier() id?: string;
  @IsOptional() @IsInt() @Min(1) revision?: number;
}

export class InitialQuarterCardDto extends PreparationInputDto {
  @IsIn(QUARTERS) quarter!: QuarterDto;
  @IsOptional() @IsUniqueIdentifier() status_id?: string;
  @IsOptional() @IsString() notes?: string;
  @IsOptional() @IsObject() custom_fields?: Record<string, unknown>;
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateScopeItemDto)
  scope: CreateScopeItemDto[] = [];
}

export class CreateInitiativeDto {
  @IsIn(["PROJECT", "OPERATIONAL_TASK"]) kind!: "PROJECT" | "OPERATIONAL_TASK";
  @IsString() @IsNotEmpty() name!: string;
  @IsInt() @Min(2000) @Max(2200) year!: number;
  @IsOptional() @IsString() strategic_goal?: string;
  @ValidateNested()
  @Type(() => PreparationInputDto)
  preparation!: PreparationInputDto;
  @IsOptional()
  @ValidateNested()
  @Type(() => InitialQuarterCardDto)
  initial_card?: InitialQuarterCardDto;
}

export class UpdateCardDto {
  @IsInt() @Min(1) revision!: number;
  @IsOptional() @IsUniqueIdentifier() manager_id?: string;
  @IsOptional() @IsUniqueIdentifier() priority_id?: string;
  @IsArray() @IsUniqueIdentifier({ each: true }) department_ids: string[] = [];
  @IsUniqueIdentifier() status_id!: string;
  @IsOptional() @IsString() notes?: string;
  @IsOptional() @IsObject() custom_fields?: Record<string, unknown>;
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ScopeItemDto)
  scope: ScopeItemDto[] = [];
}

export class UpdateCardStatusDto {
  @IsInt() @Min(1) revision!: number;
  @IsUniqueIdentifier() status_id!: string;
}

export class ArchiveScopeStatusDto {
  @IsUniqueIdentifier() id!: string;
  @IsInt() @Min(1) revision!: number;
  @IsIn(["DEFAULT", "GREEN", "YELLOW", "RED"]) status_code!:
    | "DEFAULT"
    | "GREEN"
    | "YELLOW"
    | "RED";
}

export class UpdateArchivedCardDto {
  @IsInt() @Min(1) revision!: number;
  @IsOptional() @IsString() notes?: string;
  @IsOptional() @IsUniqueIdentifier() status_id?: string;
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ArchiveScopeStatusDto)
  scope_status_updates: ArchiveScopeStatusDto[] = [];
}

export class PeriodCommandDto {
  @IsInt() @Min(1) revision!: number;
  @IsInt() @Min(2000) @Max(2200) to_year!: number;
  @IsIn(QUARTERS) to_quarter!: QuarterDto;
  @IsOptional() @IsInt() @Min(1) target_revision?: number;
}

export class DeleteInitiativeDto {
  @Type(() => Number) @IsInt() @Min(1) revision!: number;
}

export class RevisionTargetDto {
  @IsUniqueIdentifier() id!: string;
  @IsInt() @Min(1) revision!: number;
}

export class ExtendYearsDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => RevisionTargetDto)
  source_years!: RevisionTargetDto[];
  @IsInt() @Min(2000) @Max(2200) target_year!: number;
}

export class PreparationStageReadModelDto {
  @ApiProperty() initiative_year_id!: string;
  @ApiProperty({ nullable: true }) manager_id!: string | null;
  @ApiProperty({ nullable: true, type: Object }) manager!: {
    id: string;
    name: string;
  } | null;
  @ApiProperty({ nullable: true }) priority_id!: string | null;
  @ApiProperty({ nullable: true, type: Object }) priority!: {
    id: string;
    name: string;
  } | null;
  @ApiProperty({ type: [String] }) department_ids!: string[];
  @ApiProperty({ type: [Object] }) departments!: Array<{
    id: string;
    name: string;
  }>;
  @ApiProperty() revision!: number;
}

export class QuarterCardSummaryDto {
  @ApiProperty() id!: string;
  @ApiProperty({ enum: QUARTERS }) quarter!: QuarterDto;
  @ApiProperty() status_id!: string;
  @ApiProperty() status_code!: string;
  @ApiProperty({ nullable: true }) manager_id!: string | null;
  @ApiProperty({ nullable: true }) priority_id!: string | null;
  @ApiProperty() revision!: number;
  @ApiProperty() total_weight!: number;
  @ApiProperty() is_locked!: boolean;
  @ApiProperty() locked_at!: string;
}

export class InitiativeYearReadModelDto {
  @ApiProperty() id!: string;
  @ApiProperty() initiative_id!: string;
  @ApiProperty({ enum: ["PROJECT", "OPERATIONAL_TASK"] }) kind!: string;
  @ApiProperty() name!: string;
  @ApiProperty() initiative_revision!: number;
  @ApiProperty() year!: number;
  @ApiProperty({ nullable: true }) strategic_goal!: string | null;
  @ApiProperty() revision!: number;
  @ApiProperty({ nullable: true, type: PreparationStageReadModelDto })
  preparation!: PreparationStageReadModelDto | null;
  @ApiProperty({ type: [QuarterCardSummaryDto] })
  cards!: QuarterCardSummaryDto[];
  @ApiProperty() is_locked!: boolean;
  @ApiProperty() locked_at!: string;
}

export class ScopeItemReadModelDto {
  @ApiProperty() id!: string;
  @ApiProperty({ required: false }) lineage_id?: string;
  @ApiProperty({ nullable: true, required: false }) copied_from_item_id?: string | null;
  @ApiProperty() text!: string;
  @ApiProperty({ enum: ["DEFAULT", "GREEN", "YELLOW", "RED"] })
  status_code!: string;
  @ApiProperty({ required: false }) weight_definition_id?: string;
  @ApiProperty({ type: Object, required: false }) weight_snapshot?: {
    name: string;
    value: number;
  };
  @ApiProperty({ type: [String] }) executor_department_ids!: string[];
  @ApiProperty({ type: [Object], required: false }) executors?: Array<{
    id: string;
    name: string;
  }>;
  @ApiProperty({ nullable: true, required: false }) moved_from_card_id?: string | null;
  @ApiProperty({ required: false }) revision?: number;
}

export class QuarterCardReadModelDto {
  @ApiProperty() id!: string;
  @ApiProperty() initiative_year_id!: string;
  @ApiProperty() initiative_id!: string;
  @ApiProperty({ enum: ["PROJECT", "OPERATIONAL_TASK"] }) kind!: string;
  @ApiProperty() name!: string;
  @ApiProperty({ nullable: true }) strategic_goal!: string | null;
  @ApiProperty() year!: number;
  @ApiProperty({ enum: QUARTERS }) quarter!: QuarterDto;
  @ApiProperty({ nullable: true }) manager_id!: string | null;
  @ApiProperty({ nullable: true, type: Object }) manager!: {
    id: string;
    name: string;
  } | null;
  @ApiProperty({ nullable: true }) priority_id!: string | null;
  @ApiProperty({ nullable: true, type: Object }) priority!: {
    id: string;
    name: string;
  } | null;
  @ApiProperty({ type: [String] }) department_ids!: string[];
  @ApiProperty({ type: [String] }) effective_involved_department_ids!: string[];
  @ApiProperty() status_id!: string;
  @ApiProperty() status_code!: string;
  @ApiProperty({ type: Object }) status!: {
    id: string;
    code: string;
    name: string;
    color: string;
  };
  @ApiProperty({ nullable: true }) notes!: string | null;
  @ApiProperty() total_weight!: number;
  @ApiProperty({ type: Object }) size_snapshot!: Record<string, unknown>;
  @ApiProperty({ type: Object, additionalProperties: true })
  custom_fields!: Record<string, unknown>;
  @ApiProperty({ type: [ScopeItemReadModelDto] })
  scope!: ScopeItemReadModelDto[];
  @ApiProperty({ nullable: true, type: Object }) moved_from!: {
    year: number;
    quarter: QuarterDto;
  } | null;
  @ApiProperty() revision!: number;
  @ApiProperty() is_locked!: boolean;
  @ApiProperty() locked_at!: string;
}

export class BacklogQuarterCardSummaryDto {
  @ApiProperty() id!: string;
  @ApiProperty() initiative_year_id!: string;
  @ApiProperty() initiative_id!: string;
  @ApiProperty({ enum: ["PROJECT", "OPERATIONAL_TASK"] }) kind!: string;
  @ApiProperty() name!: string;
  @ApiProperty() year!: number;
  @ApiProperty({ enum: QUARTERS }) quarter!: QuarterDto;
  @ApiProperty({ nullable: true }) manager_id!: string | null;
  @ApiProperty({ nullable: true }) priority_id!: string | null;
  @ApiProperty({ type: [String] }) effective_involved_department_ids!: string[];
  @ApiProperty() status_id!: string;
  @ApiProperty() status_code!: string;
  @ApiProperty({ type: Object }) status!: {
    id: string;
    code: string;
    name: string;
    color: string;
  };
  @ApiProperty() scope_total!: number;
  @ApiProperty() scope_completed!: number;
  @ApiProperty() total_weight!: number;
  @ApiProperty() revision!: number;
  @ApiProperty() is_locked!: boolean;
  @ApiProperty() locked_at!: string;
}

export class InitiativeYearResponseDto {
  @ApiProperty({ enum: [true] }) success!: true;
  @ApiProperty() message!: string;
  @ApiProperty({ type: InitiativeYearReadModelDto })
  data!: InitiativeYearReadModelDto;
}

export class InitiativeYearsResponseDto {
  @ApiProperty({ enum: [true] }) success!: true;
  @ApiProperty() message!: string;
  @ApiProperty({ type: [InitiativeYearReadModelDto] })
  data!: InitiativeYearReadModelDto[];
}

export class QuarterCardResponseDto {
  @ApiProperty({ enum: [true] }) success!: true;
  @ApiProperty() message!: string;
  @ApiProperty({ type: QuarterCardReadModelDto })
  data!: QuarterCardReadModelDto;
}

export class QuarterCardsResponseDto {
  @ApiProperty({ enum: [true] }) success!: true;
  @ApiProperty() message!: string;
  @ApiProperty({ type: [QuarterCardReadModelDto] })
  data!: QuarterCardReadModelDto[];
}

export class BacklogQuarterCardSummariesResponseDto {
  @ApiProperty({ enum: [true] }) success!: true;
  @ApiProperty() message!: string;
  @ApiProperty({ type: [BacklogQuarterCardSummaryDto] })
  data!: BacklogQuarterCardSummaryDto[];
}
