import { Test, TestingModule } from '@nestjs/testing';
import { HttpService } from '@nestjs/axios';
import { VideoController } from './video.controller';
import { of } from 'rxjs';
import { AxiosResponse } from 'axios';
import { Readable } from 'stream';

describe('VideoController', () => {
  let controller: VideoController;
  let httpService: HttpService;

  const mockHttpService = {
    post: jest.fn(),
    get: jest.fn(),
  };

  const mockUser = {
    sub: 'user-id-123',
    username: 'testuser',
    email: 'test@example.com',
    role: 'USER',
  };

  const mockRequest = {
    user: mockUser,
  };

  const mockNestedUserRequest = {
    user: {
      user: mockUser,
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [VideoController],
      providers: [
        {
          provide: HttpService,
          useValue: mockHttpService,
        },
      ],
    }).compile();

    controller = module.get<VideoController>(VideoController);
    httpService = module.get<HttpService>(HttpService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('uploadVideo', () => {
    const mockFiles: Express.Multer.File[] = [
      {
        fieldname: 'videos',
        originalname: 'test1.mp4',
        encoding: '7bit',
        mimetype: 'video/mp4',
        buffer: Buffer.from('mock video content'),
        size: 1024,
      } as Express.Multer.File,
      {
        fieldname: 'videos',
        originalname: 'test2.mp4',
        encoding: '7bit',
        mimetype: 'video/mp4',
        buffer: Buffer.from('mock video content 2'),
        size: 2048,
      } as Express.Multer.File,
    ];

    const mockResponse = {
      success: true,
      message: '2 video(s) uploaded and queued for processing',
      videoIds: ['video-1', 'video-2'],
      queuePosition: 3,
      estimatedProcessingTime: '5-8 minutes',
    };

    it('should upload multiple videos successfully', async () => {
      const axiosResponse: AxiosResponse = {
        data: mockResponse,
        status: 202,
        statusText: 'Accepted',
        headers: {},
        config: {},
      } as AxiosResponse;

      mockHttpService.post.mockReturnValue(of(axiosResponse));

      const result = await controller.uploadVideo(mockFiles, mockRequest);

      expect(httpService.post).toHaveBeenCalledWith(
        'http://localhost:3000/api/v1/videos/upload',
        expect.any(FormData),
        {
          headers: {
            'Content-Type': 'multipart/form-data',
            'X-User-Id': 'user-id-123',
          },
        },
      );
      expect(result).toEqual(mockResponse);
    });

    it('should use VIDEO_SERVICE_URL environment variable when available', async () => {
      process.env.VIDEO_SERVICE_URL = 'http://custom-video-service:3000';

      const axiosResponse: AxiosResponse = {
        data: mockResponse,
        status: 202,
        statusText: 'Accepted',
        headers: {},
        config: {},
      } as AxiosResponse;

      mockHttpService.post.mockReturnValue(of(axiosResponse));

      await controller.uploadVideo(mockFiles, mockRequest);

      expect(httpService.post).toHaveBeenCalledWith(
        'http://custom-video-service:3000/api/v1/videos/upload',
        expect.any(FormData),
        expect.any(Object),
      );

      delete process.env.VIDEO_SERVICE_URL;
    });

    it('should handle nested user structure', async () => {
      const axiosResponse: AxiosResponse = {
        data: mockResponse,
        status: 202,
        statusText: 'Accepted',
        headers: {},
        config: {},
      } as AxiosResponse;

      mockHttpService.post.mockReturnValue(of(axiosResponse));

      await controller.uploadVideo(mockFiles, mockNestedUserRequest);

      expect(httpService.post).toHaveBeenCalledWith(
        'http://localhost:3000/api/v1/videos/upload',
        expect.any(FormData),
        {
          headers: {
            'Content-Type': 'multipart/form-data',
            'X-User-Id': 'user-id-123',
          },
        },
      );
    });

    it('should throw error when no files are provided', async () => {
      await expect(controller.uploadVideo([], mockRequest)).rejects.toThrow(
        'No files provided',
      );
    });

    it('should throw error when more than 3 files are provided', async () => {
      const tooManyFiles = [
        mockFiles[0],
        mockFiles[1],
        mockFiles[0],
        mockFiles[1],
      ];

      await expect(
        controller.uploadVideo(tooManyFiles, mockRequest),
      ).rejects.toThrow('Maximum 3 files allowed');
    });

    it('should handle single file as array', async () => {
      const axiosResponse: AxiosResponse = {
        data: mockResponse,
        status: 202,
        statusText: 'Accepted',
        headers: {},
        config: {},
      } as AxiosResponse;

      mockHttpService.post.mockReturnValue(of(axiosResponse));

      await controller.uploadVideo(mockFiles[0] as any, mockRequest);

      expect(httpService.post).toHaveBeenCalled();
    });
  });

  describe('uploadVideoSingle', () => {
    const mockFile: Express.Multer.File = {
      fieldname: 'video',
      originalname: 'test.mp4',
      encoding: '7bit',
      mimetype: 'video/mp4',
      buffer: Buffer.from('mock video content'),
      size: 1024,
    } as Express.Multer.File;

    const mockResponse = {
      success: true,
      message: 'Video processed successfully! 15 frames extracted.',
      videoId: 'video-id-123',
      zipPath: 'frames_test.zip',
      frameCount: 15,
      frameNames: ['frame_0001.png', 'frame_0002.png'],
    };

    it('should upload and process single video successfully', async () => {
      const axiosResponse: AxiosResponse = {
        data: mockResponse,
        status: 200,
        statusText: 'OK',
        headers: {},
        config: {},
      } as AxiosResponse;

      mockHttpService.post.mockReturnValue(of(axiosResponse));

      const result = await controller.uploadVideoSingle(mockFile, mockRequest);

      expect(httpService.post).toHaveBeenCalledWith(
        'http://localhost:3000/api/v1/videos/upload-single',
        expect.any(FormData),
        {
          headers: {
            'Content-Type': 'multipart/form-data',
            'X-User-Id': 'user-id-123',
          },
        },
      );
      expect(result).toEqual(mockResponse);
    });

    it('should use VIDEO_SERVICE_URL environment variable when available', async () => {
      process.env.VIDEO_SERVICE_URL = 'http://custom-video-service:3000';

      const axiosResponse: AxiosResponse = {
        data: mockResponse,
        status: 200,
        statusText: 'OK',
        headers: {},
        config: {},
      } as AxiosResponse;

      mockHttpService.post.mockReturnValue(of(axiosResponse));

      await controller.uploadVideoSingle(mockFile, mockRequest);

      expect(httpService.post).toHaveBeenCalledWith(
        'http://custom-video-service:3000/api/v1/videos/upload-single',
        expect.any(FormData),
        expect.any(Object),
      );

      delete process.env.VIDEO_SERVICE_URL;
    });
  });

  describe('listVideos', () => {
    const mockResponse = [
      {
        id: 'video-1',
        originalName: 'test1.mp4',
        status: 'completed',
        uploadedAt: '2023-01-01T00:00:00.000Z',
        processedAt: '2023-01-01T00:01:00.000Z',
      },
      {
        id: 'video-2',
        originalName: 'test2.mp4',
        status: 'processing',
        uploadedAt: '2023-01-01T00:02:00.000Z',
      },
    ];

    it('should list videos successfully', async () => {
      const axiosResponse: AxiosResponse = {
        data: mockResponse,
        status: 200,
        statusText: 'OK',
        headers: {},
        config: {},
      } as AxiosResponse;

      mockHttpService.get.mockReturnValue(of(axiosResponse));

      const result = await controller.listVideos(mockRequest);

      expect(httpService.get).toHaveBeenCalledWith(
        'http://localhost:3000/api/v1/videos',
        {
          headers: {
            'X-User-Id': 'user-id-123',
          },
        },
      );
      expect(result).toEqual(mockResponse);
    });

    it('should use VIDEO_SERVICE_URL environment variable when available', async () => {
      process.env.VIDEO_SERVICE_URL = 'http://custom-video-service:3000';

      const axiosResponse: AxiosResponse = {
        data: mockResponse,
        status: 200,
        statusText: 'OK',
        headers: {},
        config: {},
      } as AxiosResponse;

      mockHttpService.get.mockReturnValue(of(axiosResponse));

      await controller.listVideos(mockRequest);

      expect(httpService.get).toHaveBeenCalledWith(
        'http://custom-video-service:3000/api/v1/videos',
        expect.any(Object),
      );

      delete process.env.VIDEO_SERVICE_URL;
    });
  });

  describe('downloadVideo', () => {
    const filename = 'frames_test.zip';
    const mockResponse = new Readable();

    it('should download video successfully', async () => {
      const mockRes = {
        set: jest.fn(),
      };

      mockResponse.pipe = jest.fn();

      const axiosResponse: AxiosResponse = {
        data: mockResponse,
        status: 200,
        statusText: 'OK',
        headers: {},
        config: {},
      } as AxiosResponse;

      mockHttpService.get.mockReturnValue(of(axiosResponse));

      await controller.downloadVideo(filename, mockRequest, mockRes as any);

      expect(httpService.get).toHaveBeenCalledWith(
        `http://localhost:3000/api/v1/videos/download/${filename}`,
        {
          headers: {
            'X-User-Id': 'user-id-123',
          },
          responseType: 'stream',
        },
      );

      expect(mockRes.set).toHaveBeenCalledWith({
        'Content-Type': 'application/zip',
        'Content-Disposition': `attachment; filename=${filename}`,
      });

      expect(mockResponse.pipe).toHaveBeenCalledWith(mockRes);
    });

    it('should use VIDEO_SERVICE_URL environment variable when available', async () => {
      process.env.VIDEO_SERVICE_URL = 'http://custom-video-service:3000';

      const mockRes = {
        set: jest.fn(),
      };

      mockResponse.pipe = jest.fn();

      const axiosResponse: AxiosResponse = {
        data: mockResponse,
        status: 200,
        statusText: 'OK',
        headers: {},
        config: {},
      } as AxiosResponse;

      mockHttpService.get.mockReturnValue(of(axiosResponse));

      await controller.downloadVideo(filename, mockRequest, mockRes as any);

      expect(httpService.get).toHaveBeenCalledWith(
        `http://custom-video-service:3000/api/v1/videos/download/${filename}`,
        expect.any(Object),
      );

      delete process.env.VIDEO_SERVICE_URL;
    });
  });

  describe('getProcessingStatus', () => {
    const mockResponse = {
      processing: [
        {
          id: 'video-123',
          status: 'processing',
          progress: 65,
          startedAt: '2023-01-01T00:00:00.000Z',
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
    };

    it('should get processing status successfully', async () => {
      const axiosResponse: AxiosResponse = {
        data: mockResponse,
        status: 200,
        statusText: 'OK',
        headers: {},
        config: {},
      } as AxiosResponse;

      mockHttpService.get.mockReturnValue(of(axiosResponse));

      const result = await controller.getProcessingStatus(mockRequest);

      expect(httpService.get).toHaveBeenCalledWith(
        'http://localhost:3000/api/v1/videos/status',
        {
          headers: {
            'X-User-Id': 'user-id-123',
          },
        },
      );
      expect(result).toEqual(mockResponse);
    });
  });

  describe('getQueueStats', () => {
    const mockResponse = {
      messageCount: 3,
      consumerCount: 1,
      isConnected: true,
      estimatedWaitTime: '5-8 minutes',
    };

    it('should get queue stats successfully', async () => {
      const axiosResponse: AxiosResponse = {
        data: mockResponse,
        status: 200,
        statusText: 'OK',
        headers: {},
        config: {},
      } as AxiosResponse;

      mockHttpService.get.mockReturnValue(of(axiosResponse));

      const result = await controller.getQueueStats(mockRequest);

      expect(httpService.get).toHaveBeenCalledWith(
        'http://localhost:3000/api/v1/videos/queue/stats',
        {
          headers: {
            'X-User-Id': 'user-id-123',
          },
        },
      );
      expect(result).toEqual(mockResponse);
    });
  });
});
