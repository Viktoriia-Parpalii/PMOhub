import { Body, Controller, Get, Param, Patch } from "@nestjs/common";
import { ApiBearerAuth, ApiOkResponse, ApiTags } from "@nestjs/swagger";
import { ApiSuccessDto } from "../../common/dto/api-response.dto";
import {
  RequirePermissions,
  RequireRoles,
} from "../../common/decorators/permissions.decorator";
import { CurrentUser } from "../../common/decorators/current-user.decorator";
import { AuthUser } from "../../common/auth/auth-user";
import { UpdatePermissionDto } from "./access-control.dto";
import { AccessControlService } from "./access-control.service";

@ApiTags("access-control")
@ApiBearerAuth()
@ApiOkResponse({ type: ApiSuccessDto })
@RequirePermissions("canAccessAdmin")
@Controller("role-permissions")
export class AccessControlController {
  constructor(private readonly access: AccessControlService) {}
  @Get() async list() {
    return { success: true, data: await this.access.list() };
  }
  @RequireRoles("SUPER_ADMIN") @Patch(":role") async update(
    @Param("role") role: string,
    @Body() dto: UpdatePermissionDto,
    @CurrentUser() actor: AuthUser,
  ) {
    const data = await this.access.update(role, dto, actor);
    return { success: true, message: "Права оновлено", data };
  }
}
