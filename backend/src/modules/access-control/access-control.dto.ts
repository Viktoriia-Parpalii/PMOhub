import { IsBoolean, IsOptional } from 'class-validator';

export class UpdatePermissionDto {
  @IsOptional() @IsBoolean() canCreateEditProjects?: boolean;
  @IsOptional() @IsBoolean() canDeleteProjects?: boolean;
  @IsOptional() @IsBoolean() canAccessAdmin?: boolean;
  @IsOptional() @IsBoolean() isReadOnly?: boolean;
  @IsOptional() @IsBoolean() canEditArchive?: boolean;
}
