import { Test, TestingModule } from '@nestjs/testing';
import { HealthCheckService } from '@nestjs/terminus';

import { ConfigService } from '@/core/config/config.service';

import { HealthController } from './health.controller';
import { HealthService } from './health.service';

describe('HealthController', () => {
  let controller: HealthController;
  const healthService = {
    getEmptyResponse: jest.fn(),
    checkHealth: jest.fn(),
  };
  const configService = { get: jest.fn() };

  beforeEach(async () => {
    jest.resetAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      controllers: [HealthController],
      providers: [
        { provide: HealthService, useValue: healthService },
        { provide: ConfigService, useValue: configService },
        // consumed by the @HealthCheck() decorator
        { provide: HealthCheckService, useValue: {} },
      ],
    }).compile();

    controller = module.get<HealthController>(HealthController);
  });

  it('returns empty response when health check is disabled', async () => {
    const empty = { status: 'ok', details: {} };
    configService.get.mockReturnValue('');
    healthService.getEmptyResponse.mockReturnValue(empty);

    await expect(controller.check()).resolves.toBe(empty);
    expect(configService.get).toHaveBeenCalledWith('HEALTH_CHECK_ENABLED');
    expect(healthService.checkHealth).not.toHaveBeenCalled();
  });

  it('returns empty response when health check is the string "false"', async () => {
    const empty = { status: 'ok', details: {} };
    configService.get.mockReturnValue('false');
    healthService.getEmptyResponse.mockReturnValue(empty);

    await expect(controller.check()).resolves.toBe(empty);
    expect(healthService.checkHealth).not.toHaveBeenCalled();
  });

  it('runs real health check when enabled', async () => {
    const result = { status: 'ok', details: {} };
    configService.get.mockReturnValue('true');
    healthService.checkHealth.mockResolvedValue(result);

    await expect(controller.check()).resolves.toBe(result);
    expect(healthService.getEmptyResponse).not.toHaveBeenCalled();
  });
});
