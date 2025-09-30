import { Test, TestingModule } from '@nestjs/testing';
import { MetricsController } from './metrics.controller';
import { NodejsPrometheusService } from './infrastructure/metrics/nodejs-prometheus.service';
import { Response } from 'express';

describe('MetricsController', () => {
  let controller: MetricsController;
  let prometheusService: NodejsPrometheusService;

  const mockPrometheusService = {
    getMetrics: jest.fn(),
  };

  const mockResponse = {
    setHeader: jest.fn(),
    status: jest.fn().mockReturnThis(),
    send: jest.fn(),
  } as unknown as Response;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [MetricsController],
      providers: [
        {
          provide: NodejsPrometheusService,
          useValue: mockPrometheusService,
        },
      ],
    }).compile();

    controller = module.get<MetricsController>(MetricsController);
    prometheusService = module.get<NodejsPrometheusService>(
      NodejsPrometheusService,
    );
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getMetrics', () => {
    it('should return Prometheus metrics with correct headers', async () => {
      const mockMetrics =
        '# HELP nodejs_version_info Node.js version info\n# TYPE nodejs_version_info gauge\nnodejs_version_info{version="v18.17.0",major="18",minor="17",patch="0"} 1';

      mockPrometheusService.getMetrics.mockResolvedValue(mockMetrics);

      await controller.getMetrics(mockResponse);

      expect(prometheusService.getMetrics).toHaveBeenCalled();
      expect(mockResponse.setHeader).toHaveBeenCalledWith(
        'Content-Type',
        'text/plain; version=0.0.4; charset=utf-8',
      );
      expect(mockResponse.status).toHaveBeenCalledWith(200);
      expect(mockResponse.send).toHaveBeenCalledWith(mockMetrics);
    });

    it('should handle empty metrics', async () => {
      const emptyMetrics = '';

      mockPrometheusService.getMetrics.mockResolvedValue(emptyMetrics);

      await controller.getMetrics(mockResponse);

      expect(prometheusService.getMetrics).toHaveBeenCalled();
      expect(mockResponse.setHeader).toHaveBeenCalledWith(
        'Content-Type',
        'text/plain; version=0.0.4; charset=utf-8',
      );
      expect(mockResponse.status).toHaveBeenCalledWith(200);
      expect(mockResponse.send).toHaveBeenCalledWith(emptyMetrics);
    });

    it('should handle prometheus service errors', async () => {
      const error = new Error('Prometheus service error');
      mockPrometheusService.getMetrics.mockRejectedValue(error);

      await expect(controller.getMetrics(mockResponse)).rejects.toThrow(
        'Prometheus service error',
      );

      expect(prometheusService.getMetrics).toHaveBeenCalled();
    });
  });

  describe('health', () => {
    let uptimeSpy: jest.SpyInstance;
    let memoryUsageSpy: jest.SpyInstance;

    afterEach(() => {
      if (uptimeSpy) uptimeSpy.mockRestore();
      if (memoryUsageSpy) memoryUsageSpy.mockRestore();
    });

    it('should return health status with system information', () => {
      // Mock process methods
      uptimeSpy = jest.spyOn(process, 'uptime').mockReturnValue(150.5);
      memoryUsageSpy = jest.spyOn(process, 'memoryUsage').mockReturnValue({
        rss: 50 * 1024 * 1024, // 50 MB
        heapUsed: 30 * 1024 * 1024, // 30 MB
        heapTotal: 40 * 1024 * 1024, // 40 MB
        external: 5 * 1024 * 1024, // 5 MB
        arrayBuffers: 1 * 1024 * 1024, // 1 MB
      });

      // Use actual process values for version and pid since we can't mock them
      const result = controller.health();

      expect(result).toEqual({
        status: 'healthy',
        timestamp: expect.any(String),
        service: 'api-gateway',
        uptime: '150 seconds',
        memory: {
          rss: '50 MB',
          heapUsed: '30 MB',
          heapTotal: '40 MB',
        },
        nodeVersion: process.version,
        pid: process.pid,
      });

      // Validate timestamp format
      expect(new Date(result.timestamp).toISOString()).toBe(result.timestamp);
    });

    it('should handle fractional uptime correctly', () => {
      uptimeSpy = jest.spyOn(process, 'uptime').mockReturnValue(45.7);
      memoryUsageSpy = jest.spyOn(process, 'memoryUsage').mockReturnValue({
        rss: 10 * 1024 * 1024,
        heapUsed: 5 * 1024 * 1024,
        heapTotal: 8 * 1024 * 1024,
        external: 1 * 1024 * 1024,
        arrayBuffers: 0,
      });

      const result = controller.health();

      expect(result.uptime).toBe('45 seconds');
    });

    it('should round memory values correctly', () => {
      uptimeSpy = jest.spyOn(process, 'uptime').mockReturnValue(30);
      memoryUsageSpy = jest.spyOn(process, 'memoryUsage').mockReturnValue({
        rss: 15.7 * 1024 * 1024, // Should round to 16 MB
        heapUsed: 8.3 * 1024 * 1024, // Should round to 8 MB
        heapTotal: 12.9 * 1024 * 1024, // Should round to 13 MB
        external: 1 * 1024 * 1024,
        arrayBuffers: 0,
      });

      const result = controller.health();

      expect(result.memory).toEqual({
        rss: '16 MB',
        heapUsed: '8 MB',
        heapTotal: '13 MB',
      });
    });

    it('should handle zero uptime', () => {
      uptimeSpy = jest.spyOn(process, 'uptime').mockReturnValue(0);
      memoryUsageSpy = jest.spyOn(process, 'memoryUsage').mockReturnValue({
        rss: 10 * 1024 * 1024,
        heapUsed: 5 * 1024 * 1024,
        heapTotal: 8 * 1024 * 1024,
        external: 1 * 1024 * 1024,
        arrayBuffers: 0,
      });

      const result = controller.health();

      expect(result.uptime).toBe('0 seconds');
    });

    it('should handle large memory values', () => {
      uptimeSpy = jest.spyOn(process, 'uptime').mockReturnValue(3600);
      memoryUsageSpy = jest.spyOn(process, 'memoryUsage').mockReturnValue({
        rss: 1024 * 1024 * 1024, // 1 GB
        heapUsed: 512 * 1024 * 1024, // 512 MB
        heapTotal: 768 * 1024 * 1024, // 768 MB
        external: 100 * 1024 * 1024,
        arrayBuffers: 50 * 1024 * 1024,
      });

      const result = controller.health();

      expect(result.memory).toEqual({
        rss: '1024 MB',
        heapUsed: '512 MB',
        heapTotal: '768 MB',
      });
    });
  });
});
