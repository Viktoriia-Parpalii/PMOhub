import {
  IsEmail,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from "class-validator";

export class LoginDto {
  @IsEmail() email!: string;
  @IsString() @MinLength(1) @MaxLength(128) password!: string;
}

export class ChangePasswordDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(128)
  current_password?: string;
  @IsString() @MinLength(12) @MaxLength(128) new_password!: string;
}
