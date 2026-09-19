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
import { CurrentUser } from "../../common/decorators/current-user.decorator";
import { RequirePermissions } from "../../common/decorators/permissions.decorator";
import { AuthUser } from "../../common/auth/auth-user";
import { CreateUserDto, UpdateUserDto } from "./users.dto";
import { UsersService } from "./users.service";

@ApiTags("users")
@ApiBearerAuth()
@ApiOkResponse({ type: ApiSuccessDto })
@RequirePermissions("canAccessAdmin")
@Controller("users")
export class UsersController {
  constructor(private readonly users: UsersService) {}
  @Get() async list() {
    return { success: true, data: await this.users.list() };
  }
  @Post() create(@Body() dto: CreateUserDto, @CurrentUser() actor: AuthUser) {
    return this.users.create(dto, actor);
  }
  @Patch(":id") update(
    @Param("id") id: string,
    @Body() dto: UpdateUserDto,
    @CurrentUser() actor: AuthUser,
  ) {
    return this.users.update(id, dto, actor);
  }
  @Post(":id/reset-password") resetPassword(
    @Param("id") id: string,
    @CurrentUser() actor: AuthUser,
  ) {
    return this.users.issueTemporaryPassword(id, actor);
  }
  @Delete(":id") remove(
    @Param("id") id: string,
    @CurrentUser() actor: AuthUser,
  ) {
    return this.users.deactivate(id, actor);
  }
}
