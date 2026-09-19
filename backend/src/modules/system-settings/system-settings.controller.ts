import { Body, Controller, Patch } from "@nestjs/common";
import { ApiBearerAuth, ApiOkResponse, ApiTags } from "@nestjs/swagger";
import { AuthUser } from "../../common/auth/auth-user";
import { CurrentUser } from "../../common/decorators/current-user.decorator";
import { RequirePermissions } from "../../common/decorators/permissions.decorator";
import { ApiSuccessDto } from "../../common/dto/api-response.dto";
import { UpdateFilterOptionVisibilityDto } from "./system-settings.dto";
import { SystemSettingsService } from "./system-settings.service";

@ApiTags("system-settings")
@ApiBearerAuth()
@ApiOkResponse({ type: ApiSuccessDto })
@Controller("system-settings")
export class SystemSettingsController {
  constructor(private readonly settings: SystemSettingsService) {}

  @RequirePermissions("canAccessAdmin")
  @Patch("filter-option-visibility")
  async updateFilterOptionVisibility(
    @Body() dto: UpdateFilterOptionVisibilityDto,
    @CurrentUser() actor: AuthUser,
  ) {
    return {
      success: true,
      message: "Системні налаштування оновлено",
      data: await this.settings.updateFilterOptionVisibility(dto, actor),
    };
  }
}
