import { Module } from "@nestjs/common";
import { BootstrapController } from "./bootstrap.controller";
import { DictionariesModule } from "../dictionaries/dictionaries.module";
import { CustomFieldsModule } from "../custom-fields/custom-fields.module";
import { SystemSettingsModule } from "../system-settings/system-settings.module";

@Module({
  imports: [DictionariesModule, CustomFieldsModule, SystemSettingsModule],
  controllers: [BootstrapController],
})
export class BootstrapModule {}
