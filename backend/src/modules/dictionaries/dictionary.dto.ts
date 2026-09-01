import {
  IsBoolean,
  IsHexColor,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  Min,
} from "class-validator";

export class DictionaryDto {
  @IsOptional() @IsString() @MaxLength(200) name?: string;
  @IsOptional() @IsNumber() @Min(0) capacity_limit_points?: number;
  @IsOptional() @IsUUID() department_id?: string;
  @IsOptional() @IsHexColor() color?: string;
  @IsOptional() @IsNumber() @Min(0) weight?: number;
  @IsOptional() @IsNumber() @Min(0) min_score?: number;
  @IsOptional() @IsNumber() @Min(0) max_score?: number;
  @IsOptional() @IsBoolean() is_active?: boolean;
  @IsOptional() @IsString() @MaxLength(64) code?: string;
}
