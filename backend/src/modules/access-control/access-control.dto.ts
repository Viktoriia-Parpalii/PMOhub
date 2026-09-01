import { IsBoolean, IsOptional } from "class-validator";

export class UpdatePermissionDto {
  @IsOptional() @IsBoolean() canCreateEditInitiatives?: boolean;
  @IsOptional() @IsBoolean() canDeleteInitiatives?: boolean;
  @IsOptional() @IsBoolean() canAccessAdmin?: boolean;
  @IsOptional() @IsBoolean() isReadOnly?: boolean;
  @IsOptional() @IsBoolean() canEditArchive?: boolean;
}
