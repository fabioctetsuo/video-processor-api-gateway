import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import { Observable } from 'rxjs';
import { tap, finalize } from 'rxjs/operators';
import { NodejsPrometheusService } from '../metrics/nodejs-prometheus.service';

@Injectable()
export class NodejsMetricsInterceptor implements NestInterceptor {
  constructor(private readonly prometheusService: NodejsPrometheusService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest<Request>();
    const response = context.switchToHttp().getResponse<Response>();

    const method = request.method;
    const route = String(
      (request as any).route?.path || (request as any).path || request.url,
    );
    const startTime = process.hrtime.bigint();

    // Increment active requests counter
    this.prometheusService.incrementActiveRequests();

    return next.handle().pipe(
      tap({
        next: () => {
          const endTime = process.hrtime.bigint();
          const durationSeconds = Number(endTime - startTime) / 1e9;
          const statusCode = response.statusCode;

          // Record metrics
          this.prometheusService.incrementHttpRequests(
            String(method),
            String(route),
            Number(statusCode),
          );
          this.prometheusService.recordHttpDuration(
            String(method),
            String(route),
            Number(statusCode),
            Number(durationSeconds),
          );
        },
        error: (error: any) => {
          const endTime = process.hrtime.bigint();
          const durationSeconds = Number(endTime - startTime) / 1e9;
          const statusCode = Number(error.status) || 500;

          // Record metrics including error
          this.prometheusService.incrementHttpRequests(
            String(method),
            String(route),
            Number(statusCode),
          );
          this.prometheusService.recordHttpDuration(
            String(method),
            String(route),
            Number(statusCode),
            Number(durationSeconds),
          );
          this.prometheusService.recordError(
            'http_error',
            String(method),
            String(route),
          );
        },
      }),
      finalize(() => {
        // Decrement active requests counter
        this.prometheusService.decrementActiveRequests();
      }),
    );
  }
}
