import { ArgumentsHost, Catch, ExceptionFilter, HttpException, HttpStatus } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Response } from 'express';
import { AppError } from '../errors/app-error';

@Catch()
export class AppExceptionFilter implements ExceptionFilter {
  constructor(private readonly config: ConfigService) {}

  catch(error: unknown, host: ArgumentsHost) {
    const response = host.switchToHttp().getResponse<Response>();
    if (error instanceof AppError) {
      response.status(error.status).json({ success: false, code: error.code, message: error.message, details: error.details });
      return;
    }
    if (error instanceof HttpException) {
      const body = error.getResponse();
      response.status(error.getStatus()).json(typeof body === 'string' ? { success: false, code: 'HTTP_ERROR', message: body } : body);
      return;
    }
    if (this.isPayloadTooLarge(error)) {
      const details = this.config.get<boolean>('EXPOSE_ERROR_DETAILS') ? this.serializeError(error) : undefined;
      response.status(HttpStatus.PAYLOAD_TOO_LARGE).json({
        success: false,
        code: 'PAYLOAD_TOO_LARGE',
        message: 'Розмір запиту перевищує допустимий ліміт',
        ...(details ? { details } : {}),
      });
      return;
    }
    console.error(error);
    const details = this.config.get<boolean>('EXPOSE_ERROR_DETAILS') ? this.serializeError(error) : undefined;
    response.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
      success: false,
      code: 'INTERNAL_ERROR',
      message: 'Внутрішня помилка сервера',
      ...(details ? { details } : {}),
    });
  }

  private serializeError(error: unknown) {
    if (error instanceof Error) {
      return {
        name: error.name,
        message: error.message,
        stack: error.stack,
        ...(error.cause ? { cause: String(error.cause) } : {}),
      };
    }
    return { message: String(error) };
  }

  private isPayloadTooLarge(error: unknown): error is Error & { status?: number; type?: string } {
    return typeof error === 'object' && error !== null
      && ('status' in error && (error as { status?: number }).status === HttpStatus.PAYLOAD_TOO_LARGE
        || 'type' in error && (error as { type?: string }).type === 'entity.too.large');
  }
}
