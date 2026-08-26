import { Module } from '@nestjs/common';
import { BootstrapController } from './bootstrap.controller';
import { DictionariesModule } from '../dictionaries/dictionaries.module';
import { CustomFieldsModule } from '../custom-fields/custom-fields.module';
import { UsersModule } from '../users/users.module';

@Module({ imports: [DictionariesModule, CustomFieldsModule, UsersModule], controllers: [BootstrapController] })
export class BootstrapModule {}
