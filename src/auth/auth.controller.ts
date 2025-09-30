import {
  Controller,
  Post,
  Get,
  Body,
  UseGuards,
  Request,
} from '@nestjs/common';
import {
  ApiTags,
  ApiBody,
  ApiBearerAuth,
  ApiResponse,
  ApiProperty,
} from '@nestjs/swagger';
import { HttpService as AxiosHttpService } from '@nestjs/axios';
import { AuthGuard } from './auth.guard';
import { firstValueFrom } from 'rxjs';

class RegisterDto {
  @ApiProperty({ example: 'johndoe', description: 'Unique username' })
  username: string;

  @ApiProperty({
    example: 'john@example.com',
    description: 'Valid email address',
  })
  email: string;

  @ApiProperty({
    example: 'securePassword123',
    description: 'Password (minimum 8 characters)',
  })
  password: string;

  @ApiProperty({
    example: 'USER',
    description: 'User role',
    required: false,
    enum: ['USER', 'ADMIN'],
  })
  role?: string;
}

class LoginDto {
  @ApiProperty({ example: 'johndoe', description: 'Username' })
  username: string;

  @ApiProperty({ example: 'securePassword123', description: 'Password' })
  password: string;
}

@ApiTags('Authentication')
@Controller('auth')
export class AuthController {
  constructor(private readonly httpService: AxiosHttpService) {}

  @Post('register')
  @ApiBody({ type: RegisterDto })
  @ApiResponse({
    status: 201,
    description: 'User successfully registered',
    schema: {
      example: {
        access_token: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
        refresh_token: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
        user: {
          id: '2ee6528a-19ac-473c-9315-27b5f685268d',
          username: 'johndoe',
          email: 'john@example.com',
          role: 'USER',
        },
      },
    },
  })
  async register(@Body() registerDto: RegisterDto) {
    const response = await firstValueFrom(
      this.httpService.post(
        `${process.env.AUTH_SERVICE_URL || 'http://localhost:3002'}/auth/register`,
        registerDto,
      ),
    );
    return response.data;
  }

  @Post('login')
  @ApiBody({ type: LoginDto })
  @ApiResponse({
    status: 200,
    description: 'User successfully authenticated',
    schema: {
      example: {
        access_token: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
        refresh_token: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
        user: {
          id: '2ee6528a-19ac-473c-9315-27b5f685268d',
          username: 'johndoe',
          email: 'john@example.com',
          role: 'USER',
        },
      },
    },
  })
  async login(@Body() loginDto: LoginDto) {
    const response = await firstValueFrom(
      this.httpService.post(
        `${process.env.AUTH_SERVICE_URL || 'http://localhost:3002'}/auth/login`,
        loginDto,
      ),
    );
    return response.data;
  }

  @Post('refresh')
  @ApiBody({
    schema: {
      properties: {
        refresh_token: {
          type: 'string',
          example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
          description: 'Valid refresh token',
        },
      },
    },
  })
  @ApiResponse({
    status: 200,
    description: 'Token successfully refreshed',
    schema: {
      example: {
        access_token: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
        refresh_token: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
      },
    },
  })
  async refresh(@Body() body: { refresh_token: string }) {
    const response = await firstValueFrom(
      this.httpService.post(
        `${process.env.AUTH_SERVICE_URL || 'http://localhost:3002'}/auth/refresh`,
        body,
      ),
    );
    return response.data;
  }

  @Get('profile')
  @UseGuards(AuthGuard)
  @ApiBearerAuth()
  @ApiResponse({
    status: 200,
    description: 'User profile retrieved',
    schema: {
      example: {
        sub: '2ee6528a-19ac-473c-9315-27b5f685268d',
        username: 'johndoe',
        email: 'john@example.com',
        role: 'USER',
        iat: 1759030897,
        exp: 1759031797,
      },
    },
  })
  getProfile(@Request() req: any) {
    return req.user;
  }

  @Get('verify')
  @UseGuards(AuthGuard)
  @ApiBearerAuth()
  @ApiResponse({
    status: 200,
    description: 'Token verified successfully',
    schema: {
      example: {
        valid: true,
        user: {
          sub: '2ee6528a-19ac-473c-9315-27b5f685268d',
          username: 'johndoe',
          email: 'john@example.com',
          role: 'USER',
          iat: 1759030897,
          exp: 1759031797,
        },
      },
    },
  })
  verify(@Request() req: any) {
    return { valid: true, user: req.user };
  }
}
