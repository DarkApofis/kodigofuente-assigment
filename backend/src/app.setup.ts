import { INestApplication, ValidationPipe } from '@nestjs/common';
import { AllExceptionsFilter } from './common/http-exception.filter';

// Shared between main.ts and the e2e suite so tests exercise exactly the
// pipes, filter, prefix and CORS policy the real app runs with.
export function configureApp(app: INestApplication): void {
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );
  app.useGlobalFilters(new AllExceptionsFilter());

  // /health is required to live at the root, outside the /api prefix
  app.setGlobalPrefix('api', { exclude: ['health'] });

  // Comma-separated allowlist; CORS stays disabled when the variable is empty
  // (the nginx proxy makes the frontend same-origin). Never '*'.
  const corsOrigins = (process.env.CORS_ORIGIN ?? '')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);
  if (corsOrigins.length > 0) {
    app.enableCors({ origin: corsOrigins });
  }
}
