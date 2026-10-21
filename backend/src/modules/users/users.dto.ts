import {
  IsBoolean,
  IsEmail,
  Matches,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  MinLength,
} from "class-validator";

export class CreateUserDto {
  @IsString() @MinLength(1) @MaxLength(200) name!: string;
  @IsEmail() email!: string;
  @IsString()
  @Matches(/^[A-Z][A-Z0-9_]{1,31}$/, {
    message: "Код ролі має містити лише великі латинські літери, цифри та _",
  })
  role!: string;
  @IsOptional() @IsUUID() department_id?: string;
}

export class UpdateUserDto {
  @IsOptional() @IsString() @MinLength(1) @MaxLength(200) name?: string;
  @IsOptional() @IsEmail() email?: string;
  @IsOptional()
  @IsString()
  @Matches(/^[A-Z][A-Z0-9_]{1,31}$/, {
    message: "Код ролі має містити лише великі латинські літери, цифри та _",
  })
  role?: string;
  @IsOptional() @IsUUID() department_id?: string;
  @IsOptional() @IsBoolean() is_active?: boolean;
}
