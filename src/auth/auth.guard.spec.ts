import { Test, TestingModule } from '@nestjs/testing';
import { ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { AuthGuard } from './auth.guard';
import { of, throwError } from 'rxjs';
import { AxiosResponse } from 'axios';

describe('AuthGuard', () => {
  let guard: AuthGuard;
  let httpService: HttpService;

  const mockHttpService = {
    get: jest.fn(),
  };

  const mockHttpContext = {
    getRequest: jest.fn(),
  };

  const mockExecutionContext = {
    switchToHttp: jest.fn().mockReturnValue(mockHttpContext),
  } as unknown as ExecutionContext;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthGuard,
        {
          provide: HttpService,
          useValue: mockHttpService,
        },
      ],
    }).compile();

    guard = module.get<AuthGuard>(AuthGuard);
    httpService = module.get<HttpService>(HttpService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('canActivate', () => {
    const mockUser = {
      sub: 'user-id',
      username: 'testuser',
      email: 'test@example.com',
      role: 'USER',
    };

    it('should return true and set user data for valid token', (done) => {
      const mockRequest = {
        headers: {
          authorization: 'Bearer valid-token',
        },
        user: undefined,
      };

      mockHttpContext.getRequest.mockReturnValue(mockRequest);

      const axiosResponse: AxiosResponse = {
        data: mockUser,
        status: 200,
        statusText: 'OK',
        headers: {},
        config: {},
      } as AxiosResponse;

      mockHttpService.get.mockReturnValue(of(axiosResponse));

      const result = guard.canActivate(mockExecutionContext);

      if (typeof result === 'object' && 'subscribe' in result) {
        result.subscribe((canActivate: boolean) => {
          expect(canActivate).toBe(true);
          expect(mockRequest.user).toEqual(mockUser);
          expect(httpService.get).toHaveBeenCalledWith(
            'http://localhost:3002/auth/verify',
            {
              headers: { Authorization: 'Bearer valid-token' },
            },
          );
          done();
        });
      } else {
        fail('Expected Observable');
      }
    });

    it('should use AUTH_SERVICE_URL environment variable when available', (done) => {
      process.env.AUTH_SERVICE_URL = 'http://custom-auth-service:3002';

      const mockRequest = {
        headers: {
          authorization: 'Bearer valid-token',
        },
        user: undefined,
      };

      mockHttpContext.getRequest.mockReturnValue(mockRequest);

      const axiosResponse: AxiosResponse = {
        data: mockUser,
        status: 200,
        statusText: 'OK',
        headers: {},
        config: {},
      } as AxiosResponse;

      mockHttpService.get.mockReturnValue(of(axiosResponse));

      const result = guard.canActivate(mockExecutionContext);

      if (typeof result === 'object' && 'subscribe' in result) {
        result.subscribe(() => {
          expect(httpService.get).toHaveBeenCalledWith(
            'http://custom-auth-service:3002/auth/verify',
            {
              headers: { Authorization: 'Bearer valid-token' },
            },
          );
          delete process.env.AUTH_SERVICE_URL;
          done();
        });
      } else {
        fail('Expected Observable');
      }
    });

    it('should throw UnauthorizedException when token is missing', () => {
      const mockRequest = {
        headers: {},
      };

      mockHttpContext.getRequest.mockReturnValue(mockRequest);

      expect(() => guard.canActivate(mockExecutionContext)).toThrow(
        UnauthorizedException,
      );
      expect(() => guard.canActivate(mockExecutionContext)).toThrow(
        'Token not found',
      );
    });

    it('should throw UnauthorizedException when authorization header is malformed', () => {
      const mockRequest = {
        headers: {
          authorization: 'InvalidFormat token',
        },
      };

      mockHttpContext.getRequest.mockReturnValue(mockRequest);

      expect(() => guard.canActivate(mockExecutionContext)).toThrow(
        UnauthorizedException,
      );
      expect(() => guard.canActivate(mockExecutionContext)).toThrow(
        'Token not found',
      );
    });

    it('should throw UnauthorizedException when token verification fails', (done) => {
      const mockRequest = {
        headers: {
          authorization: 'Bearer invalid-token',
        },
      };

      mockHttpContext.getRequest.mockReturnValue(mockRequest);

      mockHttpService.get.mockReturnValue(
        throwError(() => new Error('Verification failed')),
      );

      const result = guard.canActivate(mockExecutionContext);

      if (typeof result === 'object' && 'subscribe' in result) {
        result.subscribe({
          next: () => fail('Should not succeed'),
          error: (error: Error) => {
            expect(error).toBeInstanceOf(UnauthorizedException);
            expect(error.message).toBe('Invalid token');
            done();
          },
        });
      } else {
        fail('Expected Observable');
      }
    });

    it('should handle missing authorization header', () => {
      const mockRequest = {
        headers: {
          authorization: undefined,
        },
      };

      mockHttpContext.getRequest.mockReturnValue(mockRequest);

      expect(() => guard.canActivate(mockExecutionContext)).toThrow(
        UnauthorizedException,
      );
    });

    it('should handle empty authorization header', () => {
      const mockRequest = {
        headers: {
          authorization: '',
        },
      };

      mockHttpContext.getRequest.mockReturnValue(mockRequest);

      expect(() => guard.canActivate(mockExecutionContext)).toThrow(
        UnauthorizedException,
      );
    });
  });

  describe('extractTokenFromHeader', () => {
    it('should extract token from valid Bearer authorization header', () => {
      const mockRequest = {
        headers: {
          authorization: 'Bearer valid-token-123',
        },
      } as any;

      const token = (guard as any).extractTokenFromHeader(mockRequest);
      expect(token).toBe('valid-token-123');
    });

    it('should return undefined for non-Bearer authorization type', () => {
      const mockRequest = {
        headers: {
          authorization: 'Basic dXNlcjpwYXNz',
        },
      } as any;

      const token = (guard as any).extractTokenFromHeader(mockRequest);
      expect(token).toBeUndefined();
    });

    it('should return undefined for missing authorization header', () => {
      const mockRequest = {
        headers: {},
      } as any;

      const token = (guard as any).extractTokenFromHeader(mockRequest);
      expect(token).toBeUndefined();
    });

    it('should return undefined for malformed authorization header', () => {
      const mockRequest = {
        headers: {
          authorization: 'Bearer',
        },
      } as any;

      const token = (guard as any).extractTokenFromHeader(mockRequest);
      expect(token).toBeUndefined();
    });
  });
});
