import { Controller, Get, ServiceUnavailableException } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';

const DB_CHECK_TIMEOUT_MS = 2000;

interface HealthReport {
  status: 'ok';
  database: 'up';
  uptime: number;
  timestamp: string;
}

// NOTE: this route must stay at root level ("/health", not "/api/health").
// When a global "/api" prefix is added, exclude it:
//   app.setGlobalPrefix('api', { exclude: ['health'] })
@Controller('health')
export class HealthController {
  constructor(@InjectDataSource() private readonly dataSource: DataSource) {}

  @Get()
  async check(): Promise<HealthReport> {
    try {
      await this.pingDatabase();
    } catch {
      // Deliberately opaque body: no hosts, users or stack traces leak out
      throw new ServiceUnavailableException({
        status: 'error',
        database: 'down',
      });
    }

    return {
      status: 'ok',
      database: 'up',
      uptime: Math.round(process.uptime()),
      timestamp: new Date().toISOString(),
    };
  }

  // Real round-trip to postgres, capped so the endpoint never hangs
  private async pingDatabase(): Promise<void> {
    let timer: NodeJS.Timeout | undefined;
    const timeout = new Promise<never>((_, reject) => {
      timer = setTimeout(
        () => reject(new Error('database health check timed out')),
        DB_CHECK_TIMEOUT_MS,
      );
    });

    try {
      await Promise.race([this.dataSource.query('SELECT 1'), timeout]);
    } finally {
      clearTimeout(timer);
    }
  }
}
