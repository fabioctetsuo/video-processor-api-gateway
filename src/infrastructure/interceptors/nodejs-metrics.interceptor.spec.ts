import { Test, TestingModule } from '@nestjs/testing';
import { ExecutionContext, CallHandler } from '@nestjs/common';
import { NodejsMetricsInterceptor } from './nodejs-metrics.interceptor';
import { NodejsPrometheusService } from '../metrics/nodejs-prometheus.service';
import { of, throwError } from 'rxjs';
import { Request, Response } from 'express';

describe('NodejsMetricsInterceptor', () => {
  let interceptor: NodejsMetricsInterceptor;
  let prometheusService: NodejsPrometheusService;

  const mockPrometheusService = {
    incrementActiveRequests: jest.fn(),
    decrementActiveRequests: jest.fn(),
    incrementHttpRequests: jest.fn(),
    recordHttpDuration: jest.fn(),
    recordError: jest.fn(),
  };

  const mockRequest = {
    method: 'GET',
    url: '/api/v1/test',
    route: { path: '/api/v1/test' },
  } as Request;

  const mockResponse = {
    statusCode: 200,
  } as Response;

  const mockExecutionContext = {
    switchToHttp: jest.fn().mockReturnValue({
      getRequest: jest.fn().mockReturnValue(mockRequest),
      getResponse: jest.fn().mockReturnValue(mockResponse),
    }),
  } as unknown as ExecutionContext;

  const mockCallHandler: CallHandler = {
    handle: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        NodejsMetricsInterceptor,
        {
          provide: NodejsPrometheusService,
          useValue: mockPrometheusService,
        },
      ],
    }).compile();

    interceptor = module.get<NodejsMetricsInterceptor>(
      NodejsMetricsInterceptor,
    );
    prometheusService = module.get<NodejsPrometheusService>(
      NodejsPrometheusService,
    );
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('intercept', () => {
    it('should record metrics for successful request', async () => {
      const mockData = { success: true };
      (mockCallHandler.handle as jest.Mock).mockReturnValue(of(mockData));

      const result = interceptor.intercept(
        mockExecutionContext,
        mockCallHandler,
      );
      const data = await result.toPromise();

      expect(data).toEqual(mockData);
      expect(prometheusService.incrementActiveRequests).toHaveBeenCalledTimes(
        1,
      );
      expect(prometheusService.incrementHttpRequests).toHaveBeenCalledWith(
        'GET',
        '/api/v1/test',
        200,
      );
      expect(prometheusService.recordHttpDuration).toHaveBeenCalledWith(
        'GET',
        '/api/v1/test',
        200,
        expect.any(Number),
      );

      // Verify duration is a positive number
      const durationCall = (prometheusService.recordHttpDuration as jest.Mock)
        .mock.calls[0];
      expect(durationCall[3]).toBeGreaterThanOrEqual(0);

      expect(prometheusService.recordError).not.toHaveBeenCalled();
    });

    it('should record metrics for failed request', async () => {
      const error = { status: 404, message: 'Not Found' };
      (mockCallHandler.handle as jest.Mock).mockReturnValue(
        throwError(() => error),
      );

      const result = interceptor.intercept(
        mockExecutionContext,
        mockCallHandler,
      );

      try {
        await result.toPromise();
        fail('Should have thrown error');
      } catch (err) {
        expect(err).toEqual(error);
        expect(prometheusService.incrementActiveRequests).toHaveBeenCalledTimes(
          1,
        );
        expect(prometheusService.incrementHttpRequests).toHaveBeenCalledWith(
          'GET',
          '/api/v1/test',
          404,
        );
        expect(prometheusService.recordHttpDuration).toHaveBeenCalledWith(
          'GET',
          '/api/v1/test',
          404,
          expect.any(Number),
        );
        expect(prometheusService.recordError).toHaveBeenCalledWith(
          'http_error',
          'GET',
          '/api/v1/test',
        );
      }
    });

    it('should handle error without status code', async () => {
      const error = { message: 'Internal error' };
      (mockCallHandler.handle as jest.Mock).mockReturnValue(
        throwError(() => error),
      );

      const result = interceptor.intercept(
        mockExecutionContext,
        mockCallHandler,
      );

      try {
        await result.toPromise();
        fail('Should have thrown error');
      } catch (err) {
        expect(err).toEqual(error);
        expect(prometheusService.incrementHttpRequests).toHaveBeenCalledWith(
          'GET',
          '/api/v1/test',
          500, // Default status code
        );
        expect(prometheusService.recordHttpDuration).toHaveBeenCalledWith(
          'GET',
          '/api/v1/test',
          500,
          expect.any(Number),
        );
      }
    });

    it('should handle request without route.path', async () => {
      const modifiedRequest = {
        method: 'POST',
        url: '/api/v1/custom',
        path: '/custom-path',
      } as any;

      const modifiedContext = {
        switchToHttp: jest.fn().mockReturnValue({
          getRequest: jest.fn().mockReturnValue(modifiedRequest),
          getResponse: jest.fn().mockReturnValue(mockResponse),
        }),
      } as unknown as ExecutionContext;

      (mockCallHandler.handle as jest.Mock).mockReturnValue(
        of({ data: 'test' }),
      );

      const result = interceptor.intercept(modifiedContext, mockCallHandler);
      await result.toPromise();

      expect(prometheusService.incrementHttpRequests).toHaveBeenCalledWith(
        'POST',
        '/custom-path',
        200,
      );
    });

    it('should fallback to URL when no route or path available', async () => {
      const modifiedRequest = {
        method: 'PUT',
        url: '/fallback-url',
      } as any;

      const modifiedContext = {
        switchToHttp: jest.fn().mockReturnValue({
          getRequest: jest.fn().mockReturnValue(modifiedRequest),
          getResponse: jest.fn().mockReturnValue(mockResponse),
        }),
      } as unknown as ExecutionContext;

      (mockCallHandler.handle as jest.Mock).mockReturnValue(
        of({ data: 'test' }),
      );

      const result = interceptor.intercept(modifiedContext, mockCallHandler);
      await result.toPromise();

      expect(prometheusService.incrementHttpRequests).toHaveBeenCalledWith(
        'PUT',
        '/fallback-url',
        200,
      );
    });

    it('should handle different HTTP methods', async () => {
      const modifiedRequest = {
        method: 'DELETE',
        url: '/api/v1/resource/123',
        route: { path: '/api/v1/resource/:id' },
      } as any;

      const modifiedResponse = {
        statusCode: 204,
      } as Response;

      const modifiedContext = {
        switchToHttp: jest.fn().mockReturnValue({
          getRequest: jest.fn().mockReturnValue(modifiedRequest),
          getResponse: jest.fn().mockReturnValue(modifiedResponse),
        }),
      } as unknown as ExecutionContext;

      (mockCallHandler.handle as jest.Mock).mockReturnValue(of(null));

      const result = interceptor.intercept(modifiedContext, mockCallHandler);
      await result.toPromise();

      expect(prometheusService.incrementHttpRequests).toHaveBeenCalledWith(
        'DELETE',
        '/api/v1/resource/:id',
        204,
      );
      expect(prometheusService.recordHttpDuration).toHaveBeenCalledWith(
        'DELETE',
        '/api/v1/resource/:id',
        204,
        expect.any(Number),
      );
    });

    it('should track active requests during processing', async () => {
      (mockCallHandler.handle as jest.Mock).mockReturnValue(
        of({ data: 'test' }),
      );

      const result = interceptor.intercept(
        mockExecutionContext,
        mockCallHandler,
      );

      // Before subscribing, incrementActiveRequests should have been called
      expect(prometheusService.incrementActiveRequests).toHaveBeenCalledTimes(
        1,
      );

      await result.toPromise();

      expect(prometheusService.incrementActiveRequests).toHaveBeenCalledTimes(
        1,
      );
    });

    it('should record positive request duration', async () => {
      (mockCallHandler.handle as jest.Mock).mockReturnValue(
        of({ data: 'test' }),
      );

      const result = interceptor.intercept(
        mockExecutionContext,
        mockCallHandler,
      );
      await result.toPromise();

      expect(prometheusService.recordHttpDuration).toHaveBeenCalledWith(
        'GET',
        '/api/v1/test',
        200,
        expect.any(Number),
      );

      // Verify duration is a positive number
      const durationCall = (prometheusService.recordHttpDuration as jest.Mock)
        .mock.calls[0];
      expect(durationCall[3]).toBeGreaterThanOrEqual(0);
    });
  });
});
