import { Test, TestingModule } from '@nestjs/testing';
import { HttpService } from '@nestjs/axios';
import { AuthController } from './auth.controller';
import { of, throwError } from 'rxjs';
import { AxiosResponse } from 'axios';

describe('AuthController', () => {
  let controller: AuthController;
  let httpService: HttpService;

  const mockHttpService = {
    post: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [
        {
          provide: HttpService,
          useValue: mockHttpService,
        },
      ],
    }).compile();

    controller = module.get<AuthController>(AuthController);
    httpService = module.get<HttpService>(HttpService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('register', () => {
    const registerDto = {
      username: 'testuser',
      email: 'test@example.com',
      password: 'password123',
      role: 'USER',
    };

    const mockResponse = {
      access_token: 'mock-access-token',
      refresh_token: 'mock-refresh-token',
      user: {
        id: 'user-id',
        username: 'testuser',
        email: 'test@example.com',
        role: 'USER',
      },
    };

    it('should register a user successfully', async () => {
      const axiosResponse: AxiosResponse = {
        data: mockResponse,
        status: 201,
        statusText: 'Created',
        headers: {},
        config: {},
      } as AxiosResponse;

      mockHttpService.post.mockReturnValue(of(axiosResponse));

      const result = await controller.register(registerDto);

      expect(httpService.post).toHaveBeenCalledWith(
        'http://localhost:3002/auth/register',
        registerDto,
      );
      expect(result).toEqual(mockResponse);
    });

    it('should use AUTH_SERVICE_URL environment variable when available', async () => {
      process.env.AUTH_SERVICE_URL = 'http://custom-auth-service:3002';

      const axiosResponse: AxiosResponse = {
        data: mockResponse,
        status: 201,
        statusText: 'Created',
        headers: {},
        config: {},
      } as AxiosResponse;

      mockHttpService.post.mockReturnValue(of(axiosResponse));

      await controller.register(registerDto);

      expect(httpService.post).toHaveBeenCalledWith(
        'http://custom-auth-service:3002/auth/register',
        registerDto,
      );

      delete process.env.AUTH_SERVICE_URL;
    });

    it('should handle registration errors', async () => {
      const error = { message: 'Registration failed', name: 'Error' };
      mockHttpService.post.mockReturnValue(throwError(() => error));

      await expect(controller.register(registerDto)).rejects.toEqual(error);
    });
  });

  describe('login', () => {
    const loginDto = {
      username: 'testuser',
      password: 'password123',
    };

    const mockResponse = {
      access_token: 'mock-access-token',
      refresh_token: 'mock-refresh-token',
      user: {
        id: 'user-id',
        username: 'testuser',
        email: 'test@example.com',
        role: 'USER',
      },
    };

    it('should login a user successfully', async () => {
      const axiosResponse: AxiosResponse = {
        data: mockResponse,
        status: 200,
        statusText: 'OK',
        headers: {},
        config: {},
      } as AxiosResponse;

      mockHttpService.post.mockReturnValue(of(axiosResponse));

      const result = await controller.login(loginDto);

      expect(httpService.post).toHaveBeenCalledWith(
        'http://localhost:3002/auth/login',
        loginDto,
      );
      expect(result).toEqual(mockResponse);
    });

    it('should use AUTH_SERVICE_URL environment variable when available', async () => {
      process.env.AUTH_SERVICE_URL = 'http://custom-auth-service:3002';

      const axiosResponse: AxiosResponse = {
        data: mockResponse,
        status: 200,
        statusText: 'OK',
        headers: {},
        config: {},
      } as AxiosResponse;

      mockHttpService.post.mockReturnValue(of(axiosResponse));

      await controller.login(loginDto);

      expect(httpService.post).toHaveBeenCalledWith(
        'http://custom-auth-service:3002/auth/login',
        loginDto,
      );

      delete process.env.AUTH_SERVICE_URL;
    });

    it('should handle login errors', async () => {
      const error = { message: 'Login failed', name: 'Error' };
      mockHttpService.post.mockReturnValue(throwError(() => error));

      await expect(controller.login(loginDto)).rejects.toEqual(error);
    });
  });

  describe('refresh', () => {
    const refreshBody = {
      refresh_token: 'mock-refresh-token',
    };

    const mockResponse = {
      access_token: 'new-access-token',
      refresh_token: 'new-refresh-token',
    };

    it('should refresh tokens successfully', async () => {
      const axiosResponse: AxiosResponse = {
        data: mockResponse,
        status: 200,
        statusText: 'OK',
        headers: {},
        config: {},
      } as AxiosResponse;

      mockHttpService.post.mockReturnValue(of(axiosResponse));

      const result = await controller.refresh(refreshBody);

      expect(httpService.post).toHaveBeenCalledWith(
        'http://localhost:3002/auth/refresh',
        refreshBody,
      );
      expect(result).toEqual(mockResponse);
    });

    it('should use AUTH_SERVICE_URL environment variable when available', async () => {
      process.env.AUTH_SERVICE_URL = 'http://custom-auth-service:3002';

      const axiosResponse: AxiosResponse = {
        data: mockResponse,
        status: 200,
        statusText: 'OK',
        headers: {},
        config: {},
      } as AxiosResponse;

      mockHttpService.post.mockReturnValue(of(axiosResponse));

      await controller.refresh(refreshBody);

      expect(httpService.post).toHaveBeenCalledWith(
        'http://custom-auth-service:3002/auth/refresh',
        refreshBody,
      );

      delete process.env.AUTH_SERVICE_URL;
    });

    it('should handle refresh errors', async () => {
      const error = { message: 'Token refresh failed', name: 'Error' };
      mockHttpService.post.mockReturnValue(throwError(() => error));

      await expect(controller.refresh(refreshBody)).rejects.toEqual(error);
    });
  });

  describe('getProfile', () => {
    it('should return user profile from request', () => {
      const mockUser = {
        sub: 'user-id',
        username: 'testuser',
        email: 'test@example.com',
        role: 'USER',
        iat: 1234567890,
        exp: 1234567900,
      };

      const mockRequest = {
        user: mockUser,
      };

      const result = controller.getProfile(mockRequest);

      expect(result).toEqual(mockUser);
    });
  });

  describe('verify', () => {
    it('should return verification result with user data', () => {
      const mockUser = {
        sub: 'user-id',
        username: 'testuser',
        email: 'test@example.com',
        role: 'USER',
        iat: 1234567890,
        exp: 1234567900,
      };

      const mockRequest = {
        user: mockUser,
      };

      const result = controller.verify(mockRequest);

      expect(result).toEqual({
        valid: true,
        user: mockUser,
      });
    });
  });
});
