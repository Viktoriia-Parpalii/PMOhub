import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
} from "@nestjs/common";
import { ApiBearerAuth, ApiOkResponse, ApiTags } from "@nestjs/swagger";
import { ApiSuccessDto } from "../../common/dto/api-response.dto";
import { RequirePermissions } from "../../common/decorators/permissions.decorator";
import { DictionariesService, DictionaryType } from "./dictionaries.service";
import { DictionaryDto } from "./dictionary.dto";
import { CurrentUser } from "../../common/decorators/current-user.decorator";
import { AuthUser } from "../../common/auth/auth-user";

@ApiTags("dictionaries")
@ApiBearerAuth()
@ApiOkResponse({ type: ApiSuccessDto })
@Controller("dictionaries")
export class DictionariesController {
  constructor(private readonly dictionaries: DictionariesService) {}
  @Get(":type") async list(@Param("type") type: DictionaryType) {
    return { success: true, data: await this.dictionaries.list(type) };
  }
  @RequirePermissions("canAccessAdmin") @Post(":type") create(
    @Param("type") type: DictionaryType,
    @Body() dto: DictionaryDto,
    @CurrentUser() actor: AuthUser,
  ) {
    return this.dictionaries.create(type, dto, actor);
  }
  @RequirePermissions("canAccessAdmin") @Patch(":type/:id") update(
    @Param("type") type: DictionaryType,
    @Param("id") id: string,
    @Body() dto: DictionaryDto,
    @CurrentUser() actor: AuthUser,
  ) {
    return this.dictionaries.update(type, id, dto, actor);
  }
  @RequirePermissions("canAccessAdmin") @Delete(":type/:id") remove(
    @Param("type") type: DictionaryType,
    @Param("id") id: string,
    @CurrentUser() actor: AuthUser,
  ) {
    return this.dictionaries.remove(type, id, actor);
  }
  @RequirePermissions("canAccessAdmin")
  @Post("weights/:id/apply-to-open-cards")
  applyWeight(@Param("id") id: string, @CurrentUser() actor: AuthUser) {
    return this.dictionaries.applyWeightToOpenCards(id, actor);
  }
  @RequirePermissions("canAccessAdmin")
  @Post("sizes/recalculate-open-cards")
  recalculateSizes(@CurrentUser() actor: AuthUser) {
    return this.dictionaries.recalculateOpenCardSizes(actor);
  }
}
