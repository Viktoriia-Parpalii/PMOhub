import {
  Body,
  Controller,
  Get,
  HttpCode,
  Post,
  Req,
  Res,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { ApiTags } from "@nestjs/swagger";
import { Request, Response } from "express";
import { CurrentUser } from "../../common/decorators/current-user.decorator";
import { Public } from "../../common/decorators/public.decorator";
import { AuthUser } from "../../common/auth/auth-user";
import { ChangePasswordDto, LoginDto } from "./dto";
import { AuthService } from "./auth.service";
import { AppError } from "../../common/errors/app-error";
import { HttpStatus } from "@nestjs/common";
import { Throttle } from "@nestjs/throttler";

@ApiTags("auth")
@Controller("auth")
export class AuthController {
  constructor(
    private readonly auth: AuthService,
    private readonly config: ConfigService,
  ) {}

  @Public()
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @HttpCode(200)
  @Post("login")
  async login(
    @Body() dto: LoginDto,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    this.assertAllowedOrigin(req);
    const session = await this.auth.login(
      dto.email,
      dto.password,
      req.headers["user-agent"],
    );
    this.setRefreshCookie(res, session.refresh_token);
    const { refresh_token: _, ...body } = session;
    return body;
  }

  @Public()
  @Throttle({ default: { limit: 60, ttl: 60_000 } })
  @HttpCode(200)
  @Post("refresh")
  async refresh(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    this.assertAllowedOrigin(req);
    const session = await this.auth.refresh(
      req.cookies?.pmohub_refresh,
      req.headers["user-agent"],
    );
    this.setRefreshCookie(res, session.refresh_token);
    const { refresh_token: _, ...body } = session;
    return body;
  }

  @Public()
  @HttpCode(200)
  @Post("logout")
  async logout(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
    this.assertAllowedOrigin(req);
    const result = await this.auth.logout(req.cookies?.pmohub_refresh);
    res.clearCookie("pmohub_refresh", { path: "/api/v1/auth" });
    return result;
  }

  @Get("me") me(@CurrentUser() user: AuthUser) {
    return user;
  }

  @HttpCode(200)
  @Post("change-password")
  async changePassword(
    @CurrentUser() user: AuthUser,
    @Body() dto: ChangePasswordDto,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const session = await this.auth.changePassword(
      user,
      dto.current_password,
      dto.new_password,
      req.headers["user-agent"],
    );
    this.setRefreshCookie(res, session.refresh_token);
    const { refresh_token: _, ...body } = session;
    return body;
  }

  private setRefreshCookie(response: Response, token: string) {
    response.cookie("pmohub_refresh", token, {
      httpOnly: true,
      secure: this.config.get<boolean>("COOKIE_SECURE", false),
      sameSite: this.config.get<"lax" | "none">("COOKIE_SAME_SITE", "lax"),
      path: "/api/v1/auth",
      maxAge: this.config.get<number>("REFRESH_TOKEN_DAYS", 7) * 86_400_000,
    });
  }

  private assertAllowedOrigin(request: Request) {
    const origin = request.headers.origin;
    if (!origin) return;
    const allowed = (
      this.config.get<string>("FRONTEND_ORIGINS") ??
      this.config.get<string>("FRONTEND_ORIGIN", "http://localhost:3000")
    )
      .split(",")
      .map((item) => item.trim());
    if (!allowed.includes(origin))
      throw new AppError(
        "ORIGIN_FORBIDDEN",
        "Недозволене джерело запиту",
        HttpStatus.FORBIDDEN,
      );
  }
}
