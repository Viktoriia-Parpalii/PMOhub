import { Body, Controller, Delete, Get, Param, Patch, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiTags } from '@nestjs/swagger';
import { ApiSuccessDto } from '../../common/dto/api-response.dto';
import { RequirePermissions } from '../../common/decorators/permissions.decorator';
import { DictionariesService, DictionaryType } from './dictionaries.service';
import { DictionaryDto } from './dictionary.dto';

@ApiTags('dictionaries') @ApiBearerAuth() @ApiOkResponse({ type: ApiSuccessDto }) @Controller('dictionaries')
export class DictionariesController {
  constructor(private readonly dictionaries: DictionariesService) {}
  @Get(':type') async list(@Param('type') type: DictionaryType) { return { success: true, data: await this.dictionaries.list(type) }; }
  @RequirePermissions('canAccessAdmin') @Post(':type') create(@Param('type') type: DictionaryType, @Body() dto: DictionaryDto) { return this.dictionaries.create(type, dto); }
  @RequirePermissions('canAccessAdmin') @Patch(':type/:id') update(@Param('type') type: DictionaryType, @Param('id') id: string, @Body() dto: DictionaryDto) { return this.dictionaries.update(type, id, dto); }
  @RequirePermissions('canAccessAdmin') @Delete(':type/:id') remove(@Param('type') type: DictionaryType, @Param('id') id: string) { return this.dictionaries.remove(type, id); }
  @RequirePermissions('canAccessAdmin') @Post('weights/:id/apply-to-open-cards')
  applyWeight(@Param('id') id: string) { return this.dictionaries.applyWeightToOpenCards(id); }
  @RequirePermissions('canAccessAdmin') @Post('sizes/recalculate-open-cards')
  recalculateSizes() { return this.dictionaries.recalculateOpenCardSizes(); }
}
