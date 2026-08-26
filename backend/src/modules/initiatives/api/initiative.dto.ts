import { Type } from 'class-transformer';
import { IsArray, IsBoolean, IsIn, IsInt, IsObject, IsOptional, IsString, IsUUID, Max, Min, ValidateNested } from 'class-validator';

export class PassportDto {
  @IsString() name!: string;
  @IsOptional() @IsString() strategic_goal?: string;
  @IsOptional() @IsUUID() manager_id?: string;
  @IsOptional() @IsUUID() priority?: string;
  @IsOptional() @IsString() notes?: string;
  @IsArray() @IsUUID('4', { each: true }) implementer_dept_ids: string[] = [];
  @IsArray() @IsUUID('4', { each: true }) cross_functional_dept_ids: string[] = [];
  @IsOptional() @IsObject() custom_fields?: Record<string, unknown>;
}

export class ChecklistItemDto {
  @IsOptional() @IsUUID() id?: string;
  @IsString() text!: string;
  @IsOptional() @IsBoolean() is_completed?: boolean;
  @IsOptional() @IsString() color?: string;
  @IsOptional() @IsUUID() weightId?: string;
  @IsOptional() @IsObject() weightSnapshot?: { definitionId?: string; name: string; value: number };
  @IsOptional() @IsArray() @IsUUID('4', { each: true }) assigneeIds?: string[];
  @IsArray() @IsUUID('4', { each: true }) implementer_dept_ids: string[] = [];
}

export class CreateInitiativeDto {
  @IsIn(['project', 'task', 'PROJECT', 'TASK']) kind!: string;
  @IsInt() @Min(2000) @Max(2200) year!: number;
  @ValidateNested() @Type(() => PassportDto) passport!: PassportDto;
  @IsArray() @IsIn(['Q1', 'Q2', 'Q3', 'Q4'], { each: true }) quarters!: Array<'Q1' | 'Q2' | 'Q3' | 'Q4'>;
  @IsOptional() @IsArray() @ValidateNested({ each: true }) @Type(() => ChecklistItemDto) initial_scope?: ChecklistItemDto[];
}

export class CreateQuarterCardDto {
  @IsIn(['Q1', 'Q2', 'Q3', 'Q4']) quarter!: 'Q1' | 'Q2' | 'Q3' | 'Q4';
  @ValidateNested() @Type(() => PassportDto) passport!: PassportDto;
  @IsOptional() @IsArray() @ValidateNested({ each: true }) @Type(() => ChecklistItemDto) initial_scope?: ChecklistItemDto[];
}

export class UpdateCardDto {
  @IsInt() @Min(1) revision!: number;
  @IsOptional() @ValidateNested() @Type(() => PassportDto) passport?: PassportDto;
  @IsOptional() @IsUUID() health_status?: string;
  @IsOptional() @IsArray() @ValidateNested({ each: true }) @Type(() => ChecklistItemDto) checklist?: ChecklistItemDto[];
}

export class PeriodCommandDto {
  @IsInt() @Min(1) revision!: number;
  @IsInt() @Min(2000) @Max(2200) to_year!: number;
  @IsIn(['Q1', 'Q2', 'Q3', 'Q4']) to_quarter!: 'Q1' | 'Q2' | 'Q3' | 'Q4';
  @IsOptional() @IsString() reason?: string;
  @IsOptional() @IsString() confirmation_token?: string;
}

export class DeleteInitiativeDto {
  @Type(() => Number) @IsInt() @Min(1) revision!: number;
}

export class RevisionTargetDto {
  @IsUUID() id!: string;
  @IsInt() @Min(1) revision!: number;
}

export class SourceCardPatchDto {
  @IsOptional() @IsUUID() health_status?: string;
  @IsOptional() @IsArray() @ValidateNested({ each: true }) @Type(() => ChecklistItemDto) checklist?: ChecklistItemDto[];
}

export class SavePassportDto {
  @IsInt() @Min(1) revision!: number;
  @ValidateNested() @Type(() => PassportDto) passport!: PassportDto;
  @IsArray() @ValidateNested({ each: true }) @Type(() => RevisionTargetDto) target_years: RevisionTargetDto[] = [];
  @IsArray() @ValidateNested({ each: true }) @Type(() => RevisionTargetDto) target_cards: RevisionTargetDto[] = [];
  /** Changes to the source card that must commit atomically with passport propagation. */
  @IsOptional() @ValidateNested() @Type(() => SourceCardPatchDto) source_card_patch?: SourceCardPatchDto;
}

export class ExtendYearsDto {
  @IsArray() @IsUUID('4', { each: true }) source_year_ids!: string[];
  @IsInt() @Min(2000) @Max(2200) target_year!: number;
}

export class UpdatePreparationDto extends PassportDto {
  @IsInt() @Min(1) revision!: number;
}
