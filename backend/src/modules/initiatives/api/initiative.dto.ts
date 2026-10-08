import { Transform, Type } from "class-transformer";
import {
  IsArray,
  ArrayUnique,
  IsIn,
  IsInt,
  IsNotEmpty,
  IsObject,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  MinLength,
  Min,
  ValidateNested,
} from "class-validator";
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { IsUniqueIdentifier } from "../../../common/validation/unique-identifier.decorator";

export const QUARTERS = ["Q1", "Q2", "Q3", "Q4"] as const;
export type QuarterDto = (typeof QUARTERS)[number];
export const DEPARTMENT_RELATIONS = ["ANY", "EXECUTOR", "INVOLVED"] as const;
export type DepartmentRelationDto = (typeof DEPARTMENT_RELATIONS)[number];

const trimmed = ({ value }: { value: unknown }) =>
  typeof value === "string" ? value.trim() : value;

export class InitiativeListFiltersDto {
  @ApiPropertyOptional({ maxLength: 200 })
  @IsOptional()
  @Transform(trimmed)
  @IsString()
  @MaxLength(200)
  name?: string;

  @ApiPropertyOptional({ maxLength: 500 })
  @IsOptional()
  @Transform(trimmed)
  @IsString()
  @MaxLength(500)
  strategic_goal?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUniqueIdentifier()
  manager_id?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUniqueIdentifier()
  priority_id?: string;

  @ApiPropertyOptional({
    description:
      "Підрозділ, який є виконавцем завдання скоупу або залученим до квартальної картки.",
  })
  @IsOptional()
  @IsUniqueIdentifier()
  department_id?: string;
}

export class InitiativeYearsQueryDto extends InitiativeListFiltersDto {
  @ApiPropertyOptional({ enum: ["PROJECT", "OPERATIONAL_TASK"] })
  @IsOptional()
  @Transform(({ value }) =>
    typeof value === "string" ? value.toUpperCase() : value,
  )
  @IsIn(["PROJECT", "OPERATIONAL_TASK"])
  kind?: "PROJECT" | "OPERATIONAL_TASK";

  @ApiPropertyOptional({ minimum: 2000, maximum: 2200 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(2000)
  @Max(2200)
  year?: number;

  @ApiPropertyOptional({ enum: QUARTERS })
  @IsOptional()
  @IsIn(QUARTERS)
  quarter?: QuarterDto;
}

export class QuarterCardsQueryDto extends InitiativeYearsQueryDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsUniqueIdentifier()
  status_id?: string;

  @ApiPropertyOptional({
    enum: DEPARTMENT_RELATIONS,
    default: "ANY",
    description:
      "Роль вибраного підрозділу. ANY означає виконавця або залучений підрозділ.",
  })
  @IsOptional()
  @Transform(({ value }) =>
    typeof value === "string" ? value.toUpperCase() : value,
  )
  @IsIn(DEPARTMENT_RELATIONS)
  department_relation?: DepartmentRelationDto;
}

export class InitiativeYearCountsQueryDto extends InitiativeListFiltersDto {
  @ApiProperty({ minimum: 2000, maximum: 2200 })
  @Type(() => Number)
  @IsInt()
  @Min(2000)
  @Max(2200)
  year!: number;

  @ApiPropertyOptional({ enum: QUARTERS })
  @IsOptional()
  @IsIn(QUARTERS)
  quarter?: QuarterDto;
}

export class BacklogCardSummariesQueryDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsUniqueIdentifier()
  manager_id?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUniqueIdentifier()
  priority_id?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUniqueIdentifier()
  department_id?: string;
}

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

export class InitiativeRelationRemovalDto {
  @IsUniqueIdentifier() relation_id!: string;
  @IsInt() @Min(1) revision!: number;
}

export class InitiativeRelationChangesDto {
  @IsArray()
  @ArrayUnique()
  @IsUniqueIdentifier({ each: true })
  add_initiative_ids: string[] = [];

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => InitiativeRelationRemovalDto)
  remove_relations: InitiativeRelationRemovalDto[] = [];
}

export class UpdateBacklogDto {
  @IsString() name!: string;
  @IsOptional() @IsString() strategic_goal?: string;
  @IsInt() @Min(1) initiative_revision!: number;
  @IsInt() @Min(1) year_revision!: number;
  @IsOptional()
  @ValidateNested()
  @Type(() => InitiativeRelationChangesDto)
  relation_changes?: InitiativeRelationChangesDto;
}

export class InitiativeRelationCandidatesQueryDto {
  @ApiProperty({ minLength: 2, maxLength: 500 })
  @Transform(trimmed)
  @IsString()
  @IsNotEmpty()
  @MinLength(2)
  @MaxLength(500)
  query!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUniqueIdentifier()
  exclude_initiative_id?: string;

  @ApiPropertyOptional({ enum: ["PROJECT", "OPERATIONAL_TASK"] })
  @IsOptional()
  @Transform(({ value }) =>
    typeof value === "string" ? value.toUpperCase() : value,
  )
  @IsIn(["PROJECT", "OPERATIONAL_TASK"])
  kind?: "PROJECT" | "OPERATIONAL_TASK";

  @ApiPropertyOptional({ minimum: 1, maximum: 20, default: 20 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(20)
  limit?: number;
}

export class UpdatePreparationDto extends PreparationInputDto {
  @IsInt() @Min(1) revision!: number;
}

export class CreateQuarterCardDto {
  @IsIn(QUARTERS) quarter!: QuarterDto;
}

export class ScopeGroupDto {
  @IsUniqueIdentifier() id!: string;
  @IsOptional() @IsUniqueIdentifier() lineage_id?: string;
  @Transform(trimmed)
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  title!: string;
}

export class CreateScopeItemDto {
  @IsOptional() @IsUniqueIdentifier() lineage_id?: string;
  @IsOptional() @IsUniqueIdentifier() group_id?: string;
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
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ScopeGroupDto)
  scope_groups?: ScopeGroupDto[];
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
  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  @ArrayUnique()
  @IsUniqueIdentifier({ each: true })
  related_initiative_ids?: string[];
}

export class UpdateCardDto {
  @IsInt() @Min(1) revision!: number;
  @IsOptional() @IsUniqueIdentifier() manager_id?: string;
  @IsOptional() @IsUniqueIdentifier() priority_id?: string;
  @IsArray() @IsUniqueIdentifier({ each: true }) department_ids: string[] = [];
  @IsUniqueIdentifier() status_id!: string;
  @IsOptional() @IsString() notes?: string;
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ScopeGroupDto)
  scope_groups?: ScopeGroupDto[];
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
  @ApiPropertyOptional({
    description: "Поточна ревізія цільової квартальної картки. Обов'язкова, якщо картка вже існує; не передається для нової картки.",
    minimum: 1,
  })
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

export class ResumeYearDto {
  @ApiProperty({ description: "ID останнього наявного річного запису проєкту або операційної задачі." })
  @IsUniqueIdentifier() source_year_id!: string;
  @ApiProperty({ description: "Актуальна ревізія вихідного річного запису." })
  @IsInt() @Min(1) source_revision!: number;
  @ApiProperty({ description: "Новий рік після перерви; рік має бути пізнішим за вихідний." })
  @IsInt() @Min(2000) @Max(2200) target_year!: number;
  @ApiPropertyOptional()
  @IsOptional() @IsString() @MaxLength(2000) strategic_goal?: string;
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

export class InitiativeRelationReadModelDto {
  @ApiProperty() id!: string;
  @ApiProperty({ enum: ["RELATED_INITIATIVE"] }) relation_type!: string;
  @ApiProperty() revision!: number;
  @ApiProperty() related_initiative_id!: string;
  @ApiProperty({ enum: ["PROJECT", "OPERATIONAL_TASK"] })
  related_kind!: string;
  @ApiProperty() related_name!: string;
  @ApiProperty({ type: [Number] }) available_years!: number[];
}

export class InitiativeRelationCandidateDto {
  @ApiProperty() initiative_id!: string;
  @ApiProperty({ enum: ["PROJECT", "OPERATIONAL_TASK"] }) kind!: string;
  @ApiProperty() name!: string;
  @ApiProperty({ type: [Number] }) available_years!: number[];
  @ApiProperty({ nullable: true }) relation_id!: string | null;
  @ApiProperty({ nullable: true }) relation_revision!: number | null;
}

export class InitiativeRelationCandidatesResponseDto {
  @ApiProperty({ enum: [true] }) success!: true;
  @ApiProperty() message!: string;
  @ApiProperty({ type: [InitiativeRelationCandidateDto] })
  data!: InitiativeRelationCandidateDto[];
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
  @ApiProperty({ type: [InitiativeRelationReadModelDto] })
  relations!: InitiativeRelationReadModelDto[];
  @ApiProperty() is_locked!: boolean;
  @ApiProperty() locked_at!: string;
}

export class ScopeGroupReadModelDto {
  @ApiProperty() id!: string;
  @ApiProperty() lineage_id!: string;
  @ApiProperty() title!: string;
}

export class ScopeItemReadModelDto {
  @ApiProperty() id!: string;
  @ApiProperty({ required: false }) lineage_id?: string;
  @ApiProperty({ nullable: true, required: false }) copied_from_item_id?: string | null;
  @ApiProperty({ nullable: true })
  group_id!: string | null;
  @ApiProperty()
  sort_order!: number;
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
  @ApiProperty({ type: [ScopeGroupReadModelDto] })
  scope_groups!: ScopeGroupReadModelDto[];
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
  @ApiProperty({
    description:
      "Ознака відповідності кварталу вибраному фільтру підрозділу. Без фільтра має значення true.",
  })
  matches_department_filter!: boolean;
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
  @ApiProperty() scope_in_progress!: number;
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

export class ResumeYearResultDto {
  @ApiProperty() source_year_id!: string;
  @ApiProperty() target_year_id!: string;
  @ApiProperty() revision!: number;
}

export class ResumeYearResponseDto {
  @ApiProperty({ enum: [true] }) success!: true;
  @ApiProperty() message!: string;
  @ApiProperty({ type: ResumeYearResultDto }) data!: ResumeYearResultDto;
}

export class ScopeTransferResultDto {
  @ApiProperty() source_card_id!: string;
  @ApiProperty() target_card_id!: string;
  @ApiProperty() scope_item_id!: string;
  @ApiProperty() source_card_revision!: number;
  @ApiProperty() target_card_revision!: number;
}

export class ScopeTransferResponseDto {
  @ApiProperty({ enum: [true] }) success!: true;
  @ApiProperty() message!: string;
  @ApiProperty({ type: ScopeTransferResultDto }) data!: ScopeTransferResultDto;
}

export class InitiativeYearsResponseDto {
  @ApiProperty({ enum: [true] }) success!: true;
  @ApiProperty() message!: string;
  @ApiProperty({ type: [InitiativeYearReadModelDto] })
  data!: InitiativeYearReadModelDto[];
}

export class InitiativeAvailableYearsResponseDto {
  @ApiProperty({ enum: [true] }) success!: true;
  @ApiProperty() message!: string;
  @ApiProperty({ type: [Number] }) data!: number[];
}

export class InitiativeYearCountDto {
  @ApiProperty() filtered!: number;
  @ApiProperty() total!: number;
}

export class InitiativeYearCountsDto {
  @ApiProperty({ type: InitiativeYearCountDto })
  projects!: InitiativeYearCountDto;
  @ApiProperty({ type: InitiativeYearCountDto })
  operational_tasks!: InitiativeYearCountDto;
}

export class InitiativeYearCountsResponseDto {
  @ApiProperty({ enum: [true] }) success!: true;
  @ApiProperty() message!: string;
  @ApiProperty({ type: InitiativeYearCountsDto })
  data!: InitiativeYearCountsDto;
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
