import { ServiceUnavailableException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { getDataSourceToken } from '@nestjs/typeorm';
import { HealthController } from './health.controller';

describe('HealthController', () => {
  let controller: HealthController;
  const dataSource = { query: jest.fn() };

  beforeEach(async () => {
    jest.resetAllMocks();
    const moduleRef = await Test.createTestingModule({
      controllers: [HealthController],
      providers: [{ provide: getDataSourceToken(), useValue: dataSource }],
    }).compile();

    controller = moduleRef.get(HealthController);
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('returns 200 payload when the database responds', async () => {
    dataSource.query.mockResolvedValue([{ '?column?': 1 }]);

    const result = await controller.check();

    expect(dataSource.query).toHaveBeenCalledWith('SELECT 1');
    expect(result.status).toBe('ok');
    expect(result.database).toBe('up');
    expect(typeof result.uptime).toBe('number');
    expect(result.uptime).toBeGreaterThanOrEqual(0);
    expect(new Date(result.timestamp).toISOString()).toBe(result.timestamp);
  });

  it('throws 503 with an opaque body when the database is down', async () => {
    dataSource.query.mockRejectedValue(
      new Error('connect ECONNREFUSED secret-host:5432'),
    );

    const error: unknown = await controller.check().catch((e: unknown) => e);

    expect(error).toBeInstanceOf(ServiceUnavailableException);
    const exception = error as ServiceUnavailableException;
    expect(exception.getStatus()).toBe(503);
    expect(exception.getResponse()).toEqual({
      status: 'error',
      database: 'down',
    });
    // The driver error (host, stack) must never reach the response body
    expect(JSON.stringify(exception.getResponse())).not.toContain(
      'secret-host',
    );
  });

  it('throws 503 when the database check exceeds the 2s timeout', async () => {
    jest.useFakeTimers();
    dataSource.query.mockReturnValue(new Promise(() => undefined));

    const pending = controller.check();
    jest.advanceTimersByTime(2000);
    const error: unknown = await pending.catch((e: unknown) => e);

    expect(error).toBeInstanceOf(ServiceUnavailableException);
    expect((error as ServiceUnavailableException).getStatus()).toBe(503);
  });
});
