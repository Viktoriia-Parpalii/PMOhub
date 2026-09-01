import {
  MiddlewareConsumer,
  Module,
  NestModule,
  RequestMethod,
} from "@nestjs/common";
import { APP_GUARD } from "@nestjs/core";
import { ConfigModule } from "@nestjs/config";
import { ThrottlerGuard, ThrottlerModule } from "@nestjs/throttler";
import { environmentSchema } from "./config/environment";
import { DatabaseModule } from "./infrastructure/database/database.module";
import { AuthModule } from "./modules/auth/auth.module";
import { HealthModule } from "./modules/health/health.module";
import { AccessTokenGuard } from "./common/guards/access-token.guard";
import { PermissionsGuard } from "./common/guards/permissions.guard";
import { RequestLoggerMiddleware } from "./common/logging/request-logger.middleware";
import { InitiativesModule } from "./modules/initiatives/initiatives.module";
import { UsersModule } from "./modules/users/users.module";
import { AccessControlModule } from "./modules/access-control/access-control.module";
import { DictionariesModule } from "./modules/dictionaries/dictionaries.module";
import { CustomFieldsModule } from "./modules/custom-fields/custom-fields.module";
import { BootstrapModule } from "./modules/bootstrap/bootstrap.module";
import { AnalyticsModule } from "./modules/analytics/analytics.module";
import { AuditModule } from "./modules/audit/audit.module";
import { ExportsModule } from "./modules/exports/exports.module";

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      validationSchema: environmentSchema,
    }),
    ThrottlerModule.forRoot([{ ttl: 60_000, limit: 100 }]),
    DatabaseModule,
    AuthModule,
    HealthModule,
    InitiativesModule,
    UsersModule,
    AccessControlModule,
    DictionariesModule,
    CustomFieldsModule,
    BootstrapModule,
    AnalyticsModule,
    AuditModule,
    ExportsModule,
  ],
  providers: [
    { provide: APP_GUARD, useClass: ThrottlerGuard },
    { provide: APP_GUARD, useClass: AccessTokenGuard },
    { provide: APP_GUARD, useClass: PermissionsGuard },
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer
      .apply(RequestLoggerMiddleware)
      .forRoutes({ path: "*splat", method: RequestMethod.ALL });
  }
}
