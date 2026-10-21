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
import { CustomFieldDto } from "./custom-field.dto";
import { CustomFieldsService } from "./custom-fields.service";
import { CurrentUser } from "../../common/decorators/current-user.decorator";
import { AuthUser } from "../../common/auth/auth-user";

@ApiTags("custom-fields")
@ApiBearerAuth()
@ApiOkResponse({ type: ApiSuccessDto })
@Controller("custom-fields")
export class CustomFieldsController {
  constructor(private readonly fields: CustomFieldsService) {}
  @Get() async list() {
    return { success: true, data: await this.fields.list() };
  }
  @RequirePermissions("canAccessAdmin") @Post() create(
    @Body() dto: CustomFieldDto,
    @CurrentUser() actor: AuthUser,
  ) {
    return this.fields.create(dto, actor);
  }
  @RequirePermissions("canAccessAdmin") @Patch(":id") update(
    @Param("id") id: string,
    @Body() dto: CustomFieldDto,
    @CurrentUser() actor: AuthUser,
  ) {
    return this.fields.update(id, dto, actor);
  }
  @RequirePermissions("canAccessAdmin") @Delete(":id") remove(
    @Param("id") id: string,
    @CurrentUser() actor: AuthUser,
  ) {
    return this.fields.remove(id, actor);
  }
}
