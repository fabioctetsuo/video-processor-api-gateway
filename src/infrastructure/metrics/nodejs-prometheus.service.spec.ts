import { Test, TestingModule } from '@nestjs/testing';
import { NodejsPrometheusService } from './nodejs-prometheus.service';
import { register } from 'prom-client';

describe('NodejsPrometheusService', () => {
  let service: NodejsPrometheusService;

  beforeAll(() => {
    // Clear registry before all tests
    register.clear();
  });

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [NodejsPrometheusService],
    }).compile();

    service = module.get<NodejsPrometheusService>(NodejsPrometheusService);
  });

  afterEach(() => {
    // Clean up after each test
    register.clear();
  });

  describe('HTTP metrics', () => {
    it('should increment HTTP requests counter', async () => {
      const method = 'GET';
      const route = '/api/v1/test';
      const statusCode = 200;

      service.incrementHttpRequests(method, route, statusCode);

      const metrics = await register.getMetricsAsJSON();
      const httpRequestsMetric = metrics.find(
        (m) => m.name === 'http_requests_total',
      );

      expect(httpRequestsMetric).toBeDefined();
      expect(httpRequestsMetric?.values).toContainEqual(
        expect.objectContaining({
          labels: { method, route, status_code: statusCode.toString() },
          value: 1,
        }),
      );
    });

    it('should handle unknown routes', async () => {
      const method = 'POST';
      const route = '';
      const statusCode = 404;

      service.incrementHttpRequests(method, route, statusCode);

      const metrics = await register.getMetricsAsJSON();
      const httpRequestsMetric = metrics.find(
        (m) => m.name === 'http_requests_total',
      );

      expect(httpRequestsMetric?.values).toContainEqual(
        expect.objectContaining({
          labels: {
            method,
            route: 'unknown',
            status_code: statusCode.toString(),
          },
          value: 1,
        }),
      );
    });

    it('should record HTTP request duration', async () => {
      const method = 'GET';
      const route = '/api/v1/test';
      const statusCode = 200;
      const duration = 0.5;

      service.recordHttpDuration(method, route, statusCode, duration);

      const metrics = await register.getMetricsAsJSON();
      const durationMetric = metrics.find(
        (m) => m.name === 'http_request_duration_seconds',
      );
      const summaryMetric = metrics.find(
        (m) => m.name === 'http_request_summary_seconds',
      );

      expect(durationMetric).toBeDefined();
      expect(summaryMetric).toBeDefined();

      // Check that histogram was recorded
      const histogramValue = durationMetric?.values.find(
        (v) =>
          v.labels.method === method &&
          v.labels.route === route &&
          v.labels.status_code === statusCode.toString(),
      );
      expect(histogramValue).toBeDefined();

      // Check that summary was recorded
      const summaryValue = summaryMetric?.values.find(
        (v) => v.labels.method === method && v.labels.route === route,
      );
      expect(summaryValue).toBeDefined();
    });

    it('should handle multiple HTTP requests', async () => {
      service.incrementHttpRequests('GET', '/test1', 200);
      service.incrementHttpRequests('POST', '/test2', 201);
      service.incrementHttpRequests('GET', '/test1', 200); // Same request again

      const metrics = await register.getMetricsAsJSON();
      const httpRequestsMetric = metrics.find(
        (m) => m.name === 'http_requests_total',
      );

      expect(httpRequestsMetric?.values).toContainEqual(
        expect.objectContaining({
          labels: { method: 'GET', route: '/test1', status_code: '200' },
          value: 2,
        }),
      );

      expect(httpRequestsMetric?.values).toContainEqual(
        expect.objectContaining({
          labels: { method: 'POST', route: '/test2', status_code: '201' },
          value: 1,
        }),
      );
    });
  });

  describe('Active requests tracking', () => {
    it('should increment and decrement active requests', async () => {
      service.incrementActiveRequests();
      service.incrementActiveRequests();

      let metrics = await register.getMetricsAsJSON();
      let activeRequestsMetric = metrics.find(
        (m) => m.name === 'nodejs_active_requests',
      );

      expect(activeRequestsMetric?.values[0]?.value).toBe(2);

      service.decrementActiveRequests();

      metrics = await register.getMetricsAsJSON();
      activeRequestsMetric = metrics.find(
        (m) => m.name === 'nodejs_active_requests',
      );

      expect(activeRequestsMetric?.values[0]?.value).toBe(1);
    });
  });

  describe('Auth operations tracking', () => {
    it('should record auth operations', async () => {
      const operation = 'login';
      const status = 'success';

      service.recordAuthOperation(operation, status);

      const metrics = await register.getMetricsAsJSON();
      const authOperationsMetric = metrics.find(
        (m) => m.name === 'auth_operations_total',
      );
      const businessMetric = metrics.find(
        (m) => m.name === 'business_operations_total',
      );

      expect(authOperationsMetric?.values).toContainEqual(
        expect.objectContaining({
          labels: { operation, status },
          value: 1,
        }),
      );

      expect(businessMetric?.values).toContainEqual(
        expect.objectContaining({
          labels: { operation, service: 'auth' },
          value: 1,
        }),
      );
    });

    it('should track different auth operation types', async () => {
      service.recordAuthOperation('login', 'success');
      service.recordAuthOperation('login', 'failure');
      service.recordAuthOperation('register', 'success');

      const metrics = await register.getMetricsAsJSON();
      const authOperationsMetric = metrics.find(
        (m) => m.name === 'auth_operations_total',
      );

      expect(authOperationsMetric?.values).toHaveLength(3);
      expect(authOperationsMetric?.values).toContainEqual(
        expect.objectContaining({
          labels: { operation: 'login', status: 'success' },
          value: 1,
        }),
      );
      expect(authOperationsMetric?.values).toContainEqual(
        expect.objectContaining({
          labels: { operation: 'login', status: 'failure' },
          value: 1,
        }),
      );
      expect(authOperationsMetric?.values).toContainEqual(
        expect.objectContaining({
          labels: { operation: 'register', status: 'success' },
          value: 1,
        }),
      );
    });
  });

  describe('Error tracking', () => {
    it('should record errors', async () => {
      const type = 'validation_error';
      const method = 'POST';
      const route = '/api/v1/auth/login';

      service.recordError(type, method, route);

      const metrics = await register.getMetricsAsJSON();
      const errorMetric = metrics.find((m) => m.name === 'nodejs_errors_total');

      expect(errorMetric?.values).toContainEqual(
        expect.objectContaining({
          labels: { type, method, route },
          value: 1,
        }),
      );
    });

    it('should handle unknown routes in error tracking', async () => {
      const type = 'server_error';
      const method = 'GET';
      const route = '';

      service.recordError(type, method, route);

      const metrics = await register.getMetricsAsJSON();
      const errorMetric = metrics.find((m) => m.name === 'nodejs_errors_total');

      expect(errorMetric?.values).toContainEqual(
        expect.objectContaining({
          labels: { type, method, route: 'unknown' },
          value: 1,
        }),
      );
    });
  });

  describe('Business operations tracking', () => {
    it('should record business operations', async () => {
      const operation = 'video_upload';
      const service_name = 'video';

      service.recordBusinessOperation(operation, service_name);

      const metrics = await register.getMetricsAsJSON();
      const businessMetric = metrics.find(
        (m) => m.name === 'business_operations_total',
      );

      expect(businessMetric?.values).toContainEqual(
        expect.objectContaining({
          labels: { operation, service: service_name },
          value: 1,
        }),
      );
    });
  });

  describe('Active handles tracking', () => {
    it('should update active handles count', async () => {
      const handleCount = 42;

      service.updateActiveHandles(handleCount);

      const metrics = await register.getMetricsAsJSON();
      const activeHandlesMetric = metrics.find(
        (m) => m.name === 'nodejs_active_handles',
      );

      expect(activeHandlesMetric?.values[0]?.value).toBe(handleCount);
    });

    it('should update active handles multiple times', async () => {
      service.updateActiveHandles(10);
      service.updateActiveHandles(25);

      const metrics = await register.getMetricsAsJSON();
      const activeHandlesMetric = metrics.find(
        (m) => m.name === 'nodejs_active_handles',
      );

      expect(activeHandlesMetric?.values[0]?.value).toBe(25);
    });
  });

  describe('Metrics retrieval', () => {
    it('should get all metrics as string', async () => {
      service.incrementHttpRequests('GET', '/test', 200);

      const metricsString = await service.getMetrics();

      expect(typeof metricsString).toBe('string');
      expect(metricsString).toContain('http_requests_total');
      expect(metricsString).toContain('# HELP');
      expect(metricsString).toContain('# TYPE');
    });

    it('should get specific metric', async () => {
      service.incrementHttpRequests('GET', '/test', 200);

      const specificMetric = await service.getMetric('http_requests_total');

      expect(specificMetric).toBeDefined();
      expect(specificMetric.name).toBe('http_requests_total');
      expect(specificMetric.values).toBeDefined();
    });

    it('should return undefined for non-existent metric', async () => {
      const nonExistentMetric = await service.getMetric('non_existent_metric');

      expect(nonExistentMetric).toBeUndefined();
    });
  });

  describe('Registry operations', () => {
    it('should reset metrics', async () => {
      service.incrementHttpRequests('GET', '/test', 200);

      let metrics = await register.getMetricsAsJSON();
      const httpRequestsMetric = metrics.find(
        (m) => m.name === 'http_requests_total',
      );
      expect(httpRequestsMetric?.values).toHaveLength(1);

      service.resetMetrics();

      metrics = await register.getMetricsAsJSON();
      const httpRequestsAfterReset = metrics.find(
        (m) => m.name === 'http_requests_total',
      );
      expect(httpRequestsAfterReset?.values).toHaveLength(0);
    });

    it('should get registry', () => {
      const registry = service.getRegistry();

      expect(registry).toBe(register);
    });
  });

  describe('Default metrics', () => {
    it('should include default Node.js metrics', async () => {
      const metricsString = await service.getMetrics();

      // Check for some common default metrics
      expect(metricsString).toContain('nodejs_heap_space_size_total_bytes');
      expect(metricsString).toContain('nodejs_heap_space_size_used_bytes');
      expect(metricsString).toContain('nodejs_version_info');
      expect(metricsString).toContain('process_cpu_user_seconds_total');
      expect(metricsString).toContain('process_cpu_system_seconds_total');
    });
  });
});
