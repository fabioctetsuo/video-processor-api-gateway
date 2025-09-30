import { Module, Global } from '@nestjs/common';
import { NodejsPrometheusService } from './nodejs-prometheus.service';

@Global()
@Module({
  providers: [NodejsPrometheusService],
  exports: [NodejsPrometheusService],
})
export class NodejsMetricsModule {}
