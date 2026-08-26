import 'reflect-metadata';
import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import cookieParser from 'cookie-parser';
import { json, urlencoded } from 'express';
import helmet from 'helmet';
import { AppModule } from './app.module';
import { AppExceptionFilter } from './common/filters/app-exception.filter';

export async function createApp() {
  const app = await NestFactory.create(AppModule, { bodyParser: false });
  const config = app.get(ConfigService);
  const bodyLimit = config.get<string>('HTTP_BODY_LIMIT', '10mb');
  app.use(json({ limit: bodyLimit }));
  app.use(urlencoded({ limit: bodyLimit, extended: true }));
  app.setGlobalPrefix('api/v1');
  const origins = (config.get<string>('FRONTEND_ORIGINS') ?? config.get<string>('FRONTEND_ORIGIN', 'http://localhost:3000')).split(',').map((item) => item.trim()).filter(Boolean);
  app.enableCors({ origin: origins, credentials: true });
  app.use(helmet());
  app.use(cookieParser());
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }));
  app.useGlobalFilters(new AppExceptionFilter(config));
  app.enableShutdownHooks();

  const document = SwaggerModule.createDocument(app, new DocumentBuilder()
    .setTitle('PMO Hub API').setVersion('1.0').addBearerAuth().build());
  SwaggerModule.setup('api/docs', app, document);
  return app;
}

if (require.main === module) {
  createApp().then(async (app) => app.listen(app.get(ConfigService).get<number>('PORT', 4000)));
}
