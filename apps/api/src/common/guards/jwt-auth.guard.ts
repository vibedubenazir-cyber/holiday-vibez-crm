import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../../prisma.service';

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    private readonly jwtService: JwtService,
    private readonly prisma: PrismaService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const authHeader: string | undefined = request.headers['authorization'];
    const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : undefined;

    if (!token) {
      throw new UnauthorizedException('Missing access token');
    }

    try {
      const payload = this.jwtService.verify(token, { secret: process.env.JWT_SECRET });
      // Only tokens minted as real access tokens carry `typ: 'access'`. This is a
      // positive allowlist: the pre-2FA login challenge token (signed with the
      // same secret but marked `purpose: 'login-2fa-challenge'`, and any future
      // special-purpose JWT) is rejected here, so possessing the password alone
      // can never satisfy this guard — 2FA cannot be bypassed by replaying the
      // challenge token as a bearer credential.
      if (payload.typ !== 'access') {
        throw new UnauthorizedException('Not an access token');
      }
      const user = await this.prisma.user.findUnique({ where: { id: payload.sub } });
      if (!user || user.status === 'INACTIVE') {
        throw new UnauthorizedException('User inactive or not found');
      }
      request.user = user;
      return true;
    } catch {
      throw new UnauthorizedException('Invalid or expired access token');
    }
  }
}
