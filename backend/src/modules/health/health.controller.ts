import { Controller, Get, ServiceUnavailableException } from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";
import { Public } from "../../common/decorators/public.decorator";
import { PrismaService } from "../../infrastructure/database/prisma.service";

@ApiTags("health")
@Public()
@Controller("health")
export class HealthController {
  constructor(private readonly prisma: PrismaService) {}

  @Get("live") live() {
    return { status: "ok" };
  }

  @Get("ready")
  async ready() {
    try {
      await this.prisma.$queryRaw`SELECT 1 AS ready`;
      return { status: "ok", database: "connected" };
    } catch {
      throw new ServiceUnavailableException({
        status: "error",
        database: "unavailable",
      });
    }
  }
}
