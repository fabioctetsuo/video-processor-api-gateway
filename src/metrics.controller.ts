import { Controller, Get, HttpStatus, Res } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import type { Response } from 'express';
import { NodejsPrometheusService } from './infrastructure/metrics/nodejs-prometheus.service';

@ApiTags('Metrics')
@Controller()
export class MetricsController {
  constructor(private readonly prometheusService: NodejsPrometheusService) {}

  @Get('metrics')
  @ApiOperation({
    summary: 'Prometheus metrics endpoint for Node.js monitoring',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Prometheus metrics in text/plain format',
  })
  async getMetrics(@Res() response: Response): Promise<void> {
    const metrics = await this.prometheusService.getMetrics();

    response.setHeader(
      'Content-Type',
      'text/plain; version=0.0.4; charset=utf-8',
    );
    response.status(HttpStatus.OK).send(metrics);
  }

  @Get('health')
  @ApiOperation({ summary: 'Health check endpoint' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Service is healthy',
  })
  health() {
    const uptime = process.uptime();
    const memoryUsage = process.memoryUsage();

    return {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      service: 'api-gateway',
      uptime: `${Math.floor(uptime)} seconds`,
      memory: {
        rss: `${Math.round(memoryUsage.rss / 1024 / 1024)} MB`,
        heapUsed: `${Math.round(memoryUsage.heapUsed / 1024 / 1024)} MB`,
        heapTotal: `${Math.round(memoryUsage.heapTotal / 1024 / 1024)} MB`,
      },
      nodeVersion: process.version,
      pid: process.pid,
    };
  }
}
