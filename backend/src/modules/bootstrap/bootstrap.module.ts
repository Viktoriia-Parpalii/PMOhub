import { Module } from "@nestjs/common";
import { BootstrapController } from "./bootstrap.controller";
import { DictionariesModule } from "../dictionaries/dictionaries.module";
import { CustomFieldsModule } from "../custom-fields/custom-fields.module";

@Module({
  imports: [DictionariesModule, CustomFieldsModule],
  controllers: [BootstrapController],
})
export class BootstrapModule {}
