import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
} from "@nestjs/common";
import { ApiBearerAuth, ApiOkResponse, ApiTags } from "@nestjs/swagger";
import { ApiSuccessDto } from "../../../common/dto/api-response.dto";
import { CurrentUser } from "../../../common/decorators/current-user.decorator";
import { RequirePermissions } from "../../../common/decorators/permissions.decorator";
import { AuthUser } from "../../../common/auth/auth-user";
import { InitiativesService } from "../application/initiatives.service";
import { InitiativeQueryService } from "../application/initiative-query.service";
import {
  CreateInitiativeDto,
  CreateQuarterCardDto,
  DeleteInitiativeDto,
  ExtendYearsDto,
  PeriodCommandDto,
  QuarterDto,
  InitiativeYearResponseDto,
  InitiativeYearsResponseDto,
  QuarterCardResponseDto,
  QuarterCardsResponseDto,
  UpdateCardDto,
  UpdateArchivedCardDto,
  UpdateBacklogDto,
  UpdateInitiativeDto,
  UpdateInitiativeYearDto,
  UpdatePreparationDto,
} from "./initiative.dto";

@ApiTags("initiatives")
@ApiBearerAuth()
@ApiOkResponse({ type: ApiSuccessDto })
@Controller("initiatives")
export class InitiativesController {
  constructor(private readonly initiatives: InitiativesService) {}

  @RequirePermissions("canCreateEditInitiatives")
  @Post()
  create(@Body() dto: CreateInitiativeDto, @CurrentUser() user: AuthUser) {
    return this.initiatives.create(dto, user);
  }

  @RequirePermissions("canCreateEditInitiatives")
  @Patch(":id")
  update(
    @Param("id") id: string,
    @Body() dto: UpdateInitiativeDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.initiatives.updateInitiative(id, dto, user);
  }
}

@ApiTags("initiative-years")
@ApiBearerAuth()
@ApiOkResponse({ type: ApiSuccessDto })
@Controller("initiative-years")
export class InitiativeYearsController {
  constructor(
    private readonly initiatives: InitiativesService,
    private readonly queries: InitiativeQueryService,
  ) {}

  @Get()
  @ApiOkResponse({ type: InitiativeYearsResponseDto })
  list(@Query("kind") kind?: string, @Query("year") year?: string) {
    return this.queries.listYears({
      kind,
      year: year ? Number(year) : undefined,
    });
  }

  @Get("counts")
  counts(@Query("year") year: string) {
    return this.queries.countYears(Number(year));
  }

  @Get(":id")
  @ApiOkResponse({ type: InitiativeYearResponseDto })
  get(@Param("id") id: string) {
    return this.queries.getYear(id);
  }

  @RequirePermissions("canCreateEditInitiatives")
  @Patch(":id")
  update(
    @Param("id") id: string,
    @Body() dto: UpdateInitiativeYearDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.initiatives.updateYear(id, dto, user);
  }

  @RequirePermissions("canCreateEditInitiatives")
  @Patch(":id/backlog")
  updateBacklog(
    @Param("id") id: string,
    @Body() dto: UpdateBacklogDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.initiatives.updateBacklog(id, dto, user);
  }

  @RequirePermissions("canCreateEditInitiatives")
  @Patch(":id/preparation")
  updatePreparation(
    @Param("id") id: string,
    @Body() dto: UpdatePreparationDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.initiatives.updatePreparation(id, dto, user);
  }

  @RequirePermissions("canCreateEditInitiatives")
  @Post(":id/cards")
  createCard(
    @Param("id") id: string,
    @Body() dto: CreateQuarterCardDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.initiatives.createQuarterCard(id, dto, user);
  }

  @RequirePermissions("canCreateEditInitiatives")
  @Post("extend")
  extend(@Body() dto: ExtendYearsDto, @CurrentUser() user: AuthUser) {
    return this.initiatives.extendYears(dto, user);
  }

  @RequirePermissions("canDeleteInitiatives")
  @Delete(":id")
  remove(
    @Param("id") id: string,
    @Query() dto: DeleteInitiativeDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.initiatives.removeYear(id, dto.revision, user);
  }
}

@ApiTags("quarter-cards")
@ApiBearerAuth()
@ApiOkResponse({ type: ApiSuccessDto })
@Controller("quarter-cards")
export class QuarterCardsController {
  constructor(
    private readonly initiatives: InitiativesService,
    private readonly queries: InitiativeQueryService,
  ) {}

  @Get()
  @ApiOkResponse({ type: QuarterCardsResponseDto })
  list(
    @Query("kind") kind?: string,
    @Query("year") year?: string,
    @Query("quarter") quarter?: QuarterDto,
  ) {
    return this.queries.listCards({
      kind,
      year: year ? Number(year) : undefined,
      quarter,
    });
  }

  @Get(":id")
  @ApiOkResponse({ type: QuarterCardResponseDto })
  get(@Param("id") id: string) {
    return this.queries.getCard(id);
  }

  @RequirePermissions("canCreateEditInitiatives")
  @Patch(":id")
  update(
    @Param("id") id: string,
    @Body() dto: UpdateCardDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.initiatives.updateCard(id, dto, user);
  }

  @RequirePermissions("canCreateEditInitiatives", "canEditArchive")
  @Patch(":id/archive")
  updateArchive(
    @Param("id") id: string,
    @Body() dto: UpdateArchivedCardDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.initiatives.updateArchivedCard(id, dto, user);
  }

  @RequirePermissions("canCreateEditInitiatives")
  @Post(":id/move")
  move(
    @Param("id") id: string,
    @Body() dto: PeriodCommandDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.initiatives.moveCard(id, dto, user);
  }

  @RequirePermissions("canCreateEditInitiatives")
  @Post(":id/continue")
  continueCard(
    @Param("id") id: string,
    @Body() dto: PeriodCommandDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.initiatives.continueCard(id, dto, user);
  }

  @RequirePermissions("canCreateEditInitiatives")
  @Post(":cardId/scope/:itemId/move")
  moveScope(
    @Param("cardId") cardId: string,
    @Param("itemId") itemId: string,
    @Body() dto: PeriodCommandDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.initiatives.moveScope(cardId, itemId, dto, user);
  }

  @RequirePermissions("canCreateEditInitiatives")
  @Post(":cardId/scope/:itemId/copy")
  copyScope(
    @Param("cardId") cardId: string,
    @Param("itemId") itemId: string,
    @Body() dto: PeriodCommandDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.initiatives.copyScope(cardId, itemId, dto, user);
  }

  @RequirePermissions("canDeleteInitiatives")
  @Delete(":id")
  remove(
    @Param("id") id: string,
    @Query() dto: DeleteInitiativeDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.initiatives.removeCard(id, dto.revision, user);
  }
}
