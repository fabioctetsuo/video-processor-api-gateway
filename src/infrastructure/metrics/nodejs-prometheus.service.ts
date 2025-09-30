import { Injectable } from '@nestjs/common';
import {
  register,
  Counter,
  Histogram,
  Gauge,
  collectDefaultMetrics,
  Summary,
} from 'prom-client';

@Injectable()
export class NodejsPrometheusService {
  private readonly httpRequestsTotal: Counter<string>;
  private readonly httpRequestDuration: Histogram<string>;
  private readonly httpRequestSummary: Summary<string>;
  private readonly activeConnections: Gauge<string>;
  private readonly authOperations: Counter<string>;
  private readonly apiRequestsInProgress: Gauge<string>;
  private readonly businessMetrics: Counter<string>;
  private readonly errorRate: Counter<string>;

  constructor() {
    // Enable default metrics collection with proper configuration
    collectDefaultMetrics({
      register,
      prefix: 'nodejs_',
    });

    // HTTP request metrics (compatible with Node.js dashboard)
    this.httpRequestsTotal = new Counter({
      name: 'http_requests_total',
      help: 'Total number of HTTP requests',
      labelNames: ['method', 'route', 'status_code'],
      registers: [register],
    });

    this.httpRequestDuration = new Histogram({
      name: 'http_request_duration_seconds',
      help: 'HTTP request duration in seconds',
      labelNames: ['method', 'route', 'status_code'],
      buckets: [0.1, 0.3, 0.5, 0.7, 1, 3, 5, 7, 10], // seconds
      registers: [register],
    });

    this.httpRequestSummary = new Summary({
      name: 'http_request_summary_seconds',
      help: 'HTTP request duration summary in seconds',
      labelNames: ['method', 'route'],
      percentiles: [0.5, 0.9, 0.95, 0.99],
      registers: [register],
    });

    // Application-specific metrics
    this.activeConnections = new Gauge({
      name: 'nodejs_active_handles',
      help: 'Number of active handles',
      registers: [register],
    });

    this.apiRequestsInProgress = new Gauge({
      name: 'nodejs_active_requests',
      help: 'Number of active requests being processed',
      registers: [register],
    });

    // Auth service specific metrics
    this.authOperations = new Counter({
      name: 'auth_operations_total',
      help: 'Total number of authentication operations',
      labelNames: ['operation', 'status'],
      registers: [register],
    });

    this.businessMetrics = new Counter({
      name: 'business_operations_total',
      help: 'Total number of business operations',
      labelNames: ['operation', 'service'],
      registers: [register],
    });

    this.errorRate = new Counter({
      name: 'nodejs_errors_total',
      help: 'Total number of errors',
      labelNames: ['type', 'method', 'route'],
      registers: [register],
    });
  }

  // HTTP metrics methods (for interceptor use)
  incrementHttpRequests(method: string, route: string, statusCode: number) {
    this.httpRequestsTotal.inc({
      method,
      route: route || 'unknown',
      status_code: statusCode.toString(),
    });
  }

  recordHttpDuration(
    method: string,
    route: string,
    statusCode: number,
    durationSeconds: number,
  ) {
    const labels = {
      method,
      route: route || 'unknown',
      status_code: statusCode.toString(),
    };

    this.httpRequestDuration.observe(labels, durationSeconds);
    this.httpRequestSummary.observe(
      { method, route: route || 'unknown' },
      durationSeconds,
    );
  }

  // Track active requests
  incrementActiveRequests() {
    this.apiRequestsInProgress.inc();
  }

  decrementActiveRequests() {
    this.apiRequestsInProgress.dec();
  }

  // Auth-specific metrics
  recordAuthOperation(operation: string, status: string) {
    this.authOperations.inc({ operation, status });
    this.businessMetrics.inc({ operation, service: 'auth' });
  }

  // Error tracking
  recordError(type: string, method: string, route: string) {
    this.errorRate.inc({ type, method, route: route || 'unknown' });
  }

  // Business operations tracking
  recordBusinessOperation(operation: string, service: string) {
    this.businessMetrics.inc({ operation, service });
  }

  // Manual metrics for Node.js dashboard compatibility
  updateActiveHandles(count: number) {
    this.activeConnections.set(count);
  }

  // Get all metrics for /metrics endpoint
  async getMetrics(): Promise<string> {
    return register.metrics();
  }

  // Get specific metric for testing
  async getMetric(metricName: string): Promise<any> {
    const metrics = await register.getMetricsAsJSON();
    return metrics.find((metric) => metric.name === metricName);
  }

  // Reset metrics (useful for testing)
  resetMetrics() {
    register.resetMetrics();
  }

  // Get registry (useful for custom metrics)
  getRegistry() {
    return register;
  }
}
