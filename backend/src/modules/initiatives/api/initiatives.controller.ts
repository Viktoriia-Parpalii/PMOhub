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
  InitiativeYearResponseDto,
  InitiativeYearsResponseDto,
  InitiativeAvailableYearsResponseDto,
  QuarterCardResponseDto,
  QuarterCardsResponseDto,
  BacklogQuarterCardSummariesResponseDto,
  BacklogCardSummariesQueryDto,
  InitiativeYearCountsQueryDto,
  InitiativeYearCountsResponseDto,
  InitiativeYearsQueryDto,
  QuarterCardsQueryDto,
  UpdateCardDto,
  UpdateCardStatusDto,
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
  list(@Query() query: InitiativeYearsQueryDto) {
    return this.queries.listYears(query);
  }

  @Get("counts")
  @ApiOkResponse({ type: InitiativeYearCountsResponseDto })
  counts(@Query() query: InitiativeYearCountsQueryDto) {
    return this.queries.countYears(query);
  }

  @Get("available-years")
  @ApiOkResponse({ type: InitiativeAvailableYearsResponseDto })
  availableYears() {
    return this.queries.availableYears();
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
  list(@Query() query: QuarterCardsQueryDto) {
    return this.queries.listCards(query);
  }

  @Get("backlog-summaries/:initiativeYearId")
  @ApiOkResponse({ type: BacklogQuarterCardSummariesResponseDto })
  listBacklogSummaries(
    @Param("initiativeYearId") initiativeYearId: string,
    @Query() query: BacklogCardSummariesQueryDto,
  ) {
    return this.queries.listBacklogCardSummaries(initiativeYearId, query);
  }

  @Get(":id")
  @ApiOkResponse({ type: QuarterCardResponseDto })
  get(@Param("id") id: string) {
    return this.queries.getCard(id);
  }

  @RequirePermissions("canCreateEditInitiatives")
  @Patch(":id/status")
  @ApiOkResponse({ type: QuarterCardResponseDto })
  updateStatus(
    @Param("id") id: string,
    @Body() dto: UpdateCardStatusDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.initiatives.updateCardStatus(id, dto, user);
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
