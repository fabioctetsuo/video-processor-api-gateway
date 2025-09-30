import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
} from '@nestjs/common';
import type { Request } from 'express';
import { HttpService } from '@nestjs/axios';
import { Observable } from 'rxjs';
import { map, catchError } from 'rxjs/operators';

@Injectable()
export class AuthGuard implements CanActivate {
  constructor(private readonly httpService: HttpService) {}

  canActivate(
    context: ExecutionContext,
  ): boolean | Promise<boolean> | Observable<boolean> {
    const request = context
      .switchToHttp()
      .getRequest<Request & { user?: any }>();
    const token = this.extractTokenFromHeader(request);

    if (!token) {
      throw new UnauthorizedException('Token not found');
    }

    // Verify token with auth service
    return this.httpService
      .get(
        `${process.env.AUTH_SERVICE_URL || 'http://localhost:3002'}/auth/verify`,
        {
          headers: { Authorization: `Bearer ${token}` },
        },
      )
      .pipe(
        map((response: any) => {
          // Add user info to request for use in controllers
          (request as any).user = response.data;
          return true;
        }),
        catchError(() => {
          throw new UnauthorizedException('Invalid token');
        }),
      );
  }

  private extractTokenFromHeader(request: Request): string | undefined {
    const [type, token] = request.headers.authorization?.split(' ') ?? [];
    return type === 'Bearer' ? token : undefined;
  }
}
