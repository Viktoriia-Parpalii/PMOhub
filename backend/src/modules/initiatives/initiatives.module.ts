import { Module } from "@nestjs/common";
import {
  InitiativesController,
  InitiativeYearsController,
  QuarterCardsController,
} from "./api/initiatives.controller";
import { InitiativesService } from "./application/initiatives.service";
import { InitiativeQueryService } from "./application/initiative-query.service";

@Module({
  controllers: [
    InitiativesController,
    InitiativeYearsController,
    QuarterCardsController,
  ],
  providers: [InitiativesService, InitiativeQueryService],
  exports: [InitiativesService, InitiativeQueryService],
})
export class InitiativesModule {}
