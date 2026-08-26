import { Module } from '@nestjs/common';
import { InitiativesModule } from '../initiatives/initiatives.module';
import { DictionariesModule } from '../dictionaries/dictionaries.module';
import { CustomFieldsModule } from '../custom-fields/custom-fields.module';
import { UsersModule } from '../users/users.module';
import { DataManagementController } from './data-management.controller';
import { DataManagementService } from './data-management.service';

@Module({ imports: [InitiativesModule, DictionariesModule, CustomFieldsModule, UsersModule], controllers: [DataManagementController], providers: [DataManagementService] })
export class DataManagementModule {}
