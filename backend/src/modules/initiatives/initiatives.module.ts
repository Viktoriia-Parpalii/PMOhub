import { Module } from '@nestjs/common';
import { InitiativesController } from './api/initiatives.controller';
import { InitiativesService } from './application/initiatives.service';

@Module({ controllers: [InitiativesController], providers: [InitiativesService], exports: [InitiativesService] })
export class InitiativesModule {}
