import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';

@Injectable()
export class AuthGuard implements CanActivate {
  constructor(private readonly jwtService: JwtService) {}

  async canActivate(context: ExecutionContext) {
    const request = context.switchToHttp().getRequest();
    if (request.method === 'POST' && request.path === '/api/auth/login') return true;
    if (request.method === 'GET' && /^\/api\/personnel\/[^/]+\/avatar$/.test(request.path)) return true;
    if (request.method === 'GET' && /^\/api\/rewards\/[^/]+\/image$/.test(request.path)) return true;
    const [type, token] = request.headers.authorization?.split(' ') ?? [];
    if (type !== 'Bearer' || !token) throw new UnauthorizedException('请先登录');
    try {
      request.user = await this.jwtService.verifyAsync(token);
      return true;
    } catch {
      throw new UnauthorizedException('登录已过期，请重新登录');
    }
  }
}
