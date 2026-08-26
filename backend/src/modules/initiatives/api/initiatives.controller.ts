import { Body, Controller, Delete, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiTags } from '@nestjs/swagger';
import { ApiSuccessDto } from '../../../common/dto/api-response.dto';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import { RequirePermissions } from '../../../common/decorators/permissions.decorator';
import { AuthUser } from '../../../common/auth/auth-user';
import { InitiativesService } from '../application/initiatives.service';
import { CreateInitiativeDto, CreateQuarterCardDto, DeleteInitiativeDto, ExtendYearsDto, PeriodCommandDto, SavePassportDto, UpdateCardDto, UpdatePreparationDto } from './initiative.dto';

@ApiTags('initiatives')
@ApiBearerAuth()
@ApiOkResponse({ type: ApiSuccessDto })
@Controller('initiatives')
export class InitiativesController {
  constructor(private readonly initiatives: InitiativesService) {}

  @Get()
  async list(@Query('kind') kind?: string, @Query('year') year?: string, @Query('quarter') quarter?: 'Q1' | 'Q2' | 'Q3' | 'Q4', @Query('is_backlog') backlog?: string) {
    const result = await this.initiatives.list({ kind, year: year ? Number(year) : undefined, quarter, is_backlog: backlog === undefined ? undefined : backlog === 'true' });
    return { success: true, ...result };
  }

  @Get('years/:id')
  getYear(@Param('id') id: string) { return this.initiatives.getYear(id); }

  @Get('cards/:id')
  getCard(@Param('id') id: string) { return this.initiatives.getCard(id); }

  @RequirePermissions('canCreateEditProjects') @Post()
  create(@Body() dto: CreateInitiativeDto, @CurrentUser() user: AuthUser) { return this.initiatives.create(dto, user); }

  @RequirePermissions('canCreateEditProjects') @Post('years/:id/cards')
  createCard(@Param('id') id: string, @Body() dto: CreateQuarterCardDto, @CurrentUser() user: AuthUser) { return this.initiatives.createQuarterCard(id, dto, user); }

  @RequirePermissions('canCreateEditProjects') @Patch('cards/:id')
  updateCard(@Param('id') id: string, @Body() dto: UpdateCardDto, @CurrentUser() user: AuthUser) { return this.initiatives.updateCard(id, dto, user); }

  @RequirePermissions('canCreateEditProjects') @Post('cards/:id/move')
  moveCard(@Param('id') id: string, @Body() dto: PeriodCommandDto, @CurrentUser() user: AuthUser) { return this.initiatives.moveCard(id, dto, user); }

  @RequirePermissions('canCreateEditProjects') @Post('cards/:id/continue')
  continueCard(@Param('id') id: string, @Body() dto: PeriodCommandDto, @CurrentUser() user: AuthUser) { return this.initiatives.continueCard(id, dto, user); }

  @RequirePermissions('canCreateEditProjects') @Post('cards/:cardId/scope/:itemId/move')
  moveScope(@Param('cardId') cardId: string, @Param('itemId') itemId: string, @Body() dto: PeriodCommandDto, @CurrentUser() user: AuthUser) { return this.initiatives.moveChecklistItem(cardId, itemId, dto, user); }

  @RequirePermissions('canCreateEditProjects') @Post('years/:id/passport')
  saveYearPassport(@Param('id') id: string, @Body() dto: SavePassportDto, @CurrentUser() user: AuthUser) { return this.initiatives.savePassport('year', id, dto, user); }

  @RequirePermissions('canCreateEditProjects') @Post('cards/:id/passport')
  saveCardPassport(@Param('id') id: string, @Body() dto: SavePassportDto, @CurrentUser() user: AuthUser) { return this.initiatives.savePassport('card', id, dto, user); }

  @RequirePermissions('canCreateEditProjects') @Post('years/extend')
  extend(@Body() dto: ExtendYearsDto, @CurrentUser() user: AuthUser) { return this.initiatives.extendYears(dto, user); }

  @RequirePermissions('canCreateEditProjects') @Patch('years/:id/preparation')
  updatePreparation(@Param('id') id: string, @Body() dto: UpdatePreparationDto, @CurrentUser() user: AuthUser) { return this.initiatives.updatePreparation(id, dto, user); }

  @RequirePermissions('canDeleteProjects') @Delete('cards/:id')
  deleteCard(@Param('id') id: string, @Query() query: DeleteInitiativeDto, @CurrentUser() user: AuthUser) { return this.initiatives.remove('card', id, query.revision, user); }

  @RequirePermissions('canDeleteProjects') @Delete('years/:id')
  deleteYear(@Param('id') id: string, @Query() query: DeleteInitiativeDto, @CurrentUser() user: AuthUser) { return this.initiatives.remove('year', id, query.revision, user); }
}
