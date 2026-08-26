import { Body, Controller, Get, ParseEnumPipe, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { RequirePermissions, RequireRoles } from '../../common/decorators/permissions.decorator';
import { AuthUser } from '../../common/auth/auth-user';
import { DataManagementService } from './data-management.service';
import { BackupImportRequestDto } from './data-management.dto';

@ApiTags('data-management') @ApiBearerAuth() @RequirePermissions('canAccessAdmin') @Controller('backups')
export class DataManagementController {
  constructor(private readonly data: DataManagementService) {}
  @Get('export') export(@CurrentUser() user: AuthUser) { return this.data.export(user); }
  @Post('validate') validate(@Body() body: unknown, @Query('mode', new ParseEnumPipe({ merge: 'merge', replace: 'replace' }, { optional: true })) mode: 'merge' | 'replace' = 'merge', @CurrentUser() user: AuthUser) { return this.data.validate(body, mode, user); }
  @RequireRoles('SUPER_ADMIN') @Post('import') import(
    @Body() body: BackupImportRequestDto,
    @Query('mode', new ParseEnumPipe({ merge: 'merge', replace: 'replace' })) mode: 'merge' | 'replace',
    @CurrentUser() user: AuthUser,
  ) { return this.data.import(body.backup, mode, user, body.validation_token); }
}
