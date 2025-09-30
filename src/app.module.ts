import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthController } from './auth/auth.controller';
import { VideoController } from './video/video.controller';
import { AuthGuard } from './auth/auth.guard';

@Module({
  imports: [HttpModule],
  controllers: [AppController, AuthController, VideoController],
  providers: [AppService, AuthGuard],
})
export class AppModule {}
