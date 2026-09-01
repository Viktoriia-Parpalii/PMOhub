import {
  IsArray,
  IsBoolean,
  IsIn,
  IsOptional,
  IsString,
  MaxLength,
} from "class-validator";

export class CustomFieldDto {
  @IsIn(["project", "task"]) entityType!: string;
  @IsString() @MaxLength(200) name!: string;
  @IsIn(["TEXT", "NUMBER", "SELECT", "CHECKBOX", "RICHTEXT"]) type!: string;
  @IsBoolean() isRequired!: boolean;
  @IsOptional() @IsArray() @IsString({ each: true }) options?: string[];
  @IsOptional() @IsBoolean() showInTable?: boolean;
  @IsOptional() @IsBoolean() showInCards?: boolean;
  @IsOptional() @IsBoolean() isActive?: boolean;
}
