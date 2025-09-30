import {
  Controller,
  Post,
  Get,
  Param,
  Body,
  UseGuards,
  Request,
  UseInterceptors,
  UploadedFile,
  UploadedFiles,
  Res,
} from '@nestjs/common';
import { FileInterceptor, FilesInterceptor } from '@nestjs/platform-express';
import {
  ApiTags,
  ApiBearerAuth,
  ApiResponse,
  ApiBody,
  ApiConsumes,
  ApiParam,
} from '@nestjs/swagger';
import { HttpService } from '@nestjs/axios';
import { AuthGuard } from '../auth/auth.guard';
import { firstValueFrom } from 'rxjs';

@ApiTags('Video Processing')
@Controller('videos')
@UseGuards(AuthGuard)
@ApiBearerAuth()
export class VideoController {
  constructor(private readonly httpService: HttpService) {}

  @Post('upload')
  @UseInterceptors(FilesInterceptor('videos', 3))
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    description: 'Upload 1-3 video files for processing',
    schema: {
      type: 'object',
      properties: {
        videos: {
          type: 'array',
          items: {
            type: 'string',
            format: 'binary',
          },
          minItems: 1,
          maxItems: 3,
          description:
            'Video files (MP4, AVI, MOV, MKV, WMV, FLV, WebM) - 1 to 3 files allowed',
        },
      },
      required: ['videos'],
    },
  })
  @ApiResponse({
    status: 202,
    description: 'Video uploaded and queued for processing',
    schema: {
      example: {
        success: true,
        message:
          '3 video(s) uploaded and queued for processing. You will be notified when processing is complete.',
        videoIds: [
          'video-123e4567-e89b-12d3-a456-426614174000',
          'video-456e7890-e12b-34d5-b678-901234567890',
          'video-789a0123-e45f-67g8-c901-234567890123',
        ],
        queuePosition: 5,
        estimatedProcessingTime: '8-12 minutes',
      },
    },
  })
  @ApiResponse({
    status: 400,
    description:
      'Invalid file format, missing files, or too many files (max 3)',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Invalid or missing JWT token',
  })
  @ApiResponse({ status: 413, description: 'File too large' })
  async uploadVideo(
    @UploadedFiles() files: Express.Multer.File[],
    @Request() req,
  ) {
    const formData = new FormData();

    // Handle both single file and multiple files
    const fileArray = Array.isArray(files) ? files : [files];

    if (!fileArray || fileArray.length === 0) {
      throw new Error('No files provided');
    }

    if (fileArray.length > 3) {
      throw new Error('Maximum 3 files allowed');
    }

    // Append each file to form data
    fileArray.forEach((file) => {
      if (file) {
        formData.append(
          'videos',
          new Blob([new Uint8Array(file.buffer)]),
          file.originalname,
        );
      }
    });

    const response = await firstValueFrom(
      this.httpService.post(
        `${process.env.VIDEO_SERVICE_URL || 'http://localhost:3000'}/api/v1/videos/upload`,
        formData,
        {
          headers: {
            'Content-Type': 'multipart/form-data',
            'X-User-Id': String(
              req.user.user ? req.user.user.sub : req.user.sub,
            ),
          },
        },
      ),
    );
    return response.data;
  }

  @Post('upload-single')
  @UseInterceptors(FileInterceptor('video'))
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    description: 'Upload and immediately process a single video file',
    schema: {
      type: 'object',
      properties: {
        video: {
          type: 'string',
          format: 'binary',
          description: 'Single video file (MP4, AVI, MOV, MKV, WMV, FLV, WebM)',
        },
      },
      required: ['video'],
    },
  })
  @ApiResponse({
    status: 200,
    description: 'Video processed immediately and frames extracted',
    schema: {
      example: {
        success: true,
        message: 'Video processed successfully! 15 frames extracted.',
        videoId: 'aae35acb-ed33-4ea8-be4e-cff0843042e3',
        zipPath: 'frames_2025-09-28T04-22-08-869Z_1.zip',
        frameCount: 15,
        frameNames: ['frame_0001.png', 'frame_0002.png', 'frame_0003.png'],
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid file format or missing file',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Invalid or missing JWT token',
  })
  @ApiResponse({ status: 413, description: 'File too large' })
  async uploadVideoSingle(
    @UploadedFile() file: Express.Multer.File,
    @Request() req,
  ) {
    const formData = new FormData();
    formData.append(
      'video',
      new Blob([new Uint8Array(file.buffer)]),
      file.originalname,
    );

    const response = await firstValueFrom(
      this.httpService.post(
        `${process.env.VIDEO_SERVICE_URL || 'http://localhost:3000'}/api/v1/videos/upload-single`,
        formData,
        {
          headers: {
            'Content-Type': 'multipart/form-data',
            'X-User-Id': String(
              req.user.user ? req.user.user.sub : req.user.sub,
            ),
          },
        },
      ),
    );
    return response.data;
  }

  @Get()
  @ApiResponse({
    status: 200,
    description: 'List all videos for authenticated user',
    schema: {
      example: [
        {
          id: '798c324c-4e7f-4a60-a617-bd63dc2136ad',
          originalName: 'sample-video.mp4',
          status: 'completed',
          uploadedAt: '2025-09-28T04:15:01.822Z',
          processedAt: '2025-09-28T04:22:09.010Z',
          zipPath: 'frames_2025-09-28T04-22-08-869Z_1.zip',
          frameCount: 6,
        },
        {
          id: '456e7890-e12b-34d5-b678-901234567890',
          originalName: 'another-video.mp4',
          status: 'failed',
          uploadedAt: '2025-09-28T04:10:00.000Z',
          processedAt: '2025-09-28T04:10:15.500Z',
          errorMessage: 'Video processing failed: Invalid video format',
        },
      ],
    },
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Invalid or missing JWT token',
  })
  async listVideos(@Request() req) {
    const response = await firstValueFrom(
      this.httpService.get(
        `${process.env.VIDEO_SERVICE_URL || 'http://localhost:3000'}/api/v1/videos`,
        {
          headers: {
            'X-User-Id': String(
              req.user.user ? req.user.user.sub : req.user.sub,
            ),
          },
        },
      ),
    );
    return response.data;
  }

  @Get('download/:filename')
  @ApiParam({
    name: 'filename',
    description: 'ZIP filename containing extracted video frames',
    example: 'frames_2025-09-28T02-17-06-815Z_1.zip',
  })
  @ApiResponse({
    status: 200,
    description: 'Download processed video frames as ZIP file',
    schema: {
      type: 'string',
      format: 'binary',
      description: 'ZIP file containing extracted video frames',
    },
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Invalid or missing JWT token',
  })
  @ApiResponse({ status: 404, description: 'File not found' })
  async downloadVideo(
    @Param('filename') filename: string,
    @Request() req,
    @Res() res,
  ) {
    const response = await firstValueFrom(
      this.httpService.get(
        `${process.env.VIDEO_SERVICE_URL || 'http://localhost:3000'}/api/v1/videos/download/${filename}`,
        {
          headers: {
            'X-User-Id': String(
              req.user.user ? req.user.user.sub : req.user.sub,
            ),
          },
          responseType: 'stream',
        },
      ),
    );

    // Set appropriate headers for file download
    res.set({
      'Content-Type': 'application/zip',
      'Content-Disposition': `attachment; filename=${filename}`,
    });

    // Pipe the stream directly to response
    response.data.pipe(res);
  }

  @Get('status')
  @ApiResponse({
    status: 200,
    description: 'Get overall video processing status and queue information',
    schema: {
      example: {
        processing: [
          {
            id: 'video-123e4567-e89b-12d3-a456-426614174000',
            status: 'processing',
            progress: 65,
            startedAt: '2025-09-28T03:32:00.000Z',
          },
        ],
        queue: {
          messageCount: 3,
          consumerCount: 1,
          estimatedWaitTime: '5-8 minutes',
        },
        statistics: {
          totalProcessed: 42,
          totalFailed: 2,
          averageProcessingTime: '3.2 minutes',
        },
      },
    },
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Invalid or missing JWT token',
  })
  async getProcessingStatus(@Request() req) {
    const response = await firstValueFrom(
      this.httpService.get(
        `${process.env.VIDEO_SERVICE_URL || 'http://localhost:3000'}/api/v1/videos/status`,
        {
          headers: {
            'X-User-Id': String(
              req.user.user ? req.user.user.sub : req.user.sub,
            ),
          },
        },
      ),
    );
    return response.data;
  }

  @Get('queue/stats')
  @ApiResponse({
    status: 200,
    description: 'Get detailed queue statistics',
    schema: {
      example: {
        messageCount: 3,
        consumerCount: 1,
        isConnected: true,
        estimatedWaitTime: '5-8 minutes',
      },
    },
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Invalid or missing JWT token',
  })
  async getQueueStats(@Request() req) {
    const response = await firstValueFrom(
      this.httpService.get(
        `${process.env.VIDEO_SERVICE_URL || 'http://localhost:3000'}/api/v1/videos/queue/stats`,
        {
          headers: {
            'X-User-Id': String(
              req.user.user ? req.user.user.sub : req.user.sub,
            ),
          },
        },
      ),
    );
    return response.data;
  }
}
