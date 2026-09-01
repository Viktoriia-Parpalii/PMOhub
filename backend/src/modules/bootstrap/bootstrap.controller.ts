import { Controller, Get } from "@nestjs/common";
import { ApiBearerAuth, ApiOkResponse, ApiTags } from "@nestjs/swagger";
import { ApiSuccessDto } from "../../common/dto/api-response.dto";
import { CurrentUser } from "../../common/decorators/current-user.decorator";
import { AuthUser } from "../../common/auth/auth-user";
import { PrismaService } from "../../infrastructure/database/prisma.service";
import { DictionariesService } from "../dictionaries/dictionaries.service";
import { CustomFieldsService } from "../custom-fields/custom-fields.service";
import { currentPeriod } from "../initiatives/domain/period.policy";

@ApiTags("bootstrap")
@ApiBearerAuth()
@ApiOkResponse({ type: ApiSuccessDto })
@Controller("bootstrap")
export class BootstrapController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly dictionaries: DictionariesService,
    private readonly fields: CustomFieldsService,
  ) {}

  @Get()
  async get(@CurrentUser() currentUser: AuthUser) {
    const [
      departments,
      managers,
      priorities,
      initiativeStatuses,
      taskWeights,
      initiativeSizes,
      customFields,
      currentRolePermission,
    ] = await Promise.all([
      this.dictionaries.list("departments"),
      this.dictionaries.list("managers"),
      this.dictionaries.list("priorities"),
      this.dictionaries.list("statuses"),
      this.dictionaries.list("weights"),
      this.dictionaries.list("sizes"),
      this.fields.list(),
      this.prisma.rolePermission.findUnique({
        where: { role: currentUser.role },
      }),
    ]);
    return {
      success: true,
      data: {
        currentUser,
        departments,
        managers,
        priorities,
        initiativeStatuses,
        taskWeights,
        initiativeSizes,
        customFields,
        rolePermissions: currentRolePermission ? [currentRolePermission] : [],
        businessPeriod: { ...currentPeriod(), time_zone: "Europe/Kyiv" },
      },
    };
  }
}
