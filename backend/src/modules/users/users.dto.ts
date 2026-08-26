import { IsBoolean, IsEmail, IsIn, IsOptional, IsString, IsUUID, MaxLength, MinLength } from 'class-validator';

export class CreateUserDto {
  @IsString() @MinLength(1) @MaxLength(200) name!: string;
  @IsEmail() email!: string;
  @IsIn(['SUPER_ADMIN', 'ADMIN', 'USER']) role!: string;
  @IsOptional() @IsUUID() department_id?: string;
}

export class UpdateUserDto {
  @IsOptional() @IsString() @MinLength(1) @MaxLength(200) name?: string;
  @IsOptional() @IsEmail() email?: string;
  @IsOptional() @IsIn(['SUPER_ADMIN', 'ADMIN', 'USER']) role?: string;
  @IsOptional() @IsUUID() department_id?: string;
  @IsOptional() @IsBoolean() is_active?: boolean;
}
