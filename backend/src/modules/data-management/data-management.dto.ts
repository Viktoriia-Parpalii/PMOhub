import { IsObject, IsString } from 'class-validator';

export class BackupImportRequestDto {
  @IsObject() backup!: Record<string, unknown>;
  @IsString() validation_token!: string;
}
