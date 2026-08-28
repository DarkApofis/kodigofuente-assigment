import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import type { Request, Response } from 'express';

interface ErrorBody {
  statusCode: number;
  message: string | string[];
  error: string;
  timestamp: string;
  path: string;
}

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    if (exception instanceof HttpException) {
      const status = exception.getStatus();
      const raw = exception.getResponse();

      // A handler that built its own contract body (e.g. GET /health's
      // { status, database }) keeps it verbatim
      if (
        typeof raw === 'object' &&
        raw !== null &&
        !('statusCode' in raw) &&
        !('message' in raw)
      ) {
        response.status(status).json(raw);
        return;
      }

      const rawObject =
        typeof raw === 'object' && raw !== null
          ? (raw as Record<string, unknown>)
          : {};
      const message =
        (rawObject.message as string | string[] | undefined) ??
        (typeof raw === 'string' ? raw : exception.message);
      const error =
        (rawObject.error as string | undefined) ?? exception.message;
      response.status(status).json(this.body(status, message, error, request));
      return;
    }

    // Unexpected error: full details go to the server log, none to the client
    this.logger.error(
      exception instanceof Error
        ? (exception.stack ?? exception.message)
        : String(exception),
    );
    response
      .status(HttpStatus.INTERNAL_SERVER_ERROR)
      .json(
        this.body(
          HttpStatus.INTERNAL_SERVER_ERROR,
          'Internal server error',
          'Internal Server Error',
          request,
        ),
      );
  }

  private body(
    statusCode: number,
    message: string | string[],
    error: string,
    request: Request,
  ): ErrorBody {
    return {
      statusCode,
      message,
      error,
      // Metadata timestamp, not business logic — clock.ts is not needed here
      timestamp: new Date().toISOString(),
      path: request.url,
    };
  }
}
