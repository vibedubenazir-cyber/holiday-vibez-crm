import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { User } from '@prisma/client';
import * as bcrypt from 'bcryptjs';
import * as crypto from 'crypto';
import { authenticator } from 'otplib';
import * as QRCode from 'qrcode';
import { PrismaService } from '../prisma.service';

const ACCESS_TOKEN_TTL = '15m';
const REFRESH_TOKEN_TTL_MS = 30 * 24 * 60 * 60 * 1000; // 30 days
const TOTP_ISSUER = 'Holiday Vibez CRM';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
  ) {}

  async login(email: string, password: string, deviceInfo: string, ipAddress: string) {
    const user = await this.prisma.user.findUnique({ where: { email } });
    if (!user || user.status === 'INACTIVE') {
      throw new UnauthorizedException('Invalid credentials');
    }

    const passwordValid = await bcrypt.compare(password, user.passwordHash);
    if (!passwordValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    // Password alone isn't enough for a 2FA-enabled account — hand back a flag
    // instead of tokens; the client must call verifyTwoFactor with a TOTP code
    // before a session is actually issued.
    if (user.twoFactorEnabled) {
      return { requiresTwoFactor: true as const, userId: user.id };
    }

    return this.issueSession(user, deviceInfo, ipAddress);
  }

  async verifyTwoFactor(userId: string, code: string, deviceInfo: string, ipAddress: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user || !user.twoFactorEnabled || !user.twoFactorSecret) {
      throw new UnauthorizedException('Two-factor authentication is not enabled for this account');
    }
    const valid = authenticator.verify({ token: code, secret: user.twoFactorSecret });
    if (!valid) {
      throw new UnauthorizedException('Invalid authentication code');
    }
    return this.issueSession(user, deviceInfo, ipAddress);
  }

  // Generates an unconfirmed secret — twoFactorEnabled stays false until
  // confirmTwoFactor validates the user actually scanned it and can produce a
  // matching code, so a half-finished setup never silently locks an account out.
  async setupTwoFactor(userId: string, email: string) {
    const secret = authenticator.generateSecret();
    await this.prisma.user.update({ where: { id: userId }, data: { twoFactorSecret: secret } });
    const otpauthUrl = authenticator.keyuri(email, TOTP_ISSUER, secret);
    const qrCodeDataUrl = await QRCode.toDataURL(otpauthUrl);
    return { secret, qrCodeDataUrl };
  }

  async confirmTwoFactor(userId: string, code: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user?.twoFactorSecret) {
      throw new UnauthorizedException('Call /auth/2fa/setup first');
    }
    const valid = authenticator.verify({ token: code, secret: user.twoFactorSecret });
    if (!valid) {
      throw new UnauthorizedException('Invalid authentication code');
    }
    await this.prisma.user.update({ where: { id: userId }, data: { twoFactorEnabled: true } });
    return { success: true };
  }

  async disableTwoFactor(userId: string) {
    await this.prisma.user.update({
      where: { id: userId },
      data: { twoFactorEnabled: false, twoFactorSecret: null },
    });
    return { success: true };
  }

  async refresh(refreshToken: string) {
    const refreshTokenHash = this.hashToken(refreshToken);
    const session = await this.prisma.session.findFirst({
      where: { refreshTokenHash, revokedAt: null },
      include: { user: true },
    });

    if (!session || this.isExpired(session.createdAt)) {
      throw new UnauthorizedException('Invalid or expired refresh token');
    }

    const accessToken = this.jwtService.sign(
      { sub: session.user.id, role: session.user.role },
      { secret: process.env.JWT_SECRET, expiresIn: ACCESS_TOKEN_TTL },
    );

    return { user: session.user, accessToken };
  }

  async logout(refreshToken: string) {
    const refreshTokenHash = this.hashToken(refreshToken);
    await this.prisma.session.updateMany({
      where: { refreshTokenHash, revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }

  async listSessions(userId: string, currentRefreshToken?: string) {
    const currentHash = currentRefreshToken ? this.hashToken(currentRefreshToken) : null;
    const sessions = await this.prisma.session.findMany({
      where: { userId, revokedAt: null },
      orderBy: { createdAt: 'desc' },
    });

    return sessions.map((s) => ({
      id: s.id,
      deviceInfo: s.deviceInfo,
      ipAddress: s.ipAddress,
      createdAt: s.createdAt,
      current: s.refreshTokenHash === currentHash,
    }));
  }

  async revokeSession(userId: string, sessionId: string) {
    await this.prisma.session.updateMany({
      where: { id: sessionId, userId },
      data: { revokedAt: new Date() },
    });
  }

  private async issueSession(user: User, deviceInfo: string, ipAddress: string) {
    const accessToken = this.jwtService.sign(
      { sub: user.id, role: user.role },
      { secret: process.env.JWT_SECRET, expiresIn: ACCESS_TOKEN_TTL },
    );

    const refreshToken = crypto.randomBytes(48).toString('hex');
    const refreshTokenHash = this.hashToken(refreshToken);

    const session = await this.prisma.session.create({
      data: {
        userId: user.id,
        deviceInfo,
        ipAddress,
        refreshTokenHash,
      },
    });

    await this.prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });

    return { requiresTwoFactor: false as const, user, accessToken, refreshToken, sessionId: session.id };
  }

  private hashToken(token: string): string {
    return crypto.createHash('sha256').update(token).digest('hex');
  }

  private isExpired(createdAt: Date): boolean {
    return Date.now() - createdAt.getTime() > REFRESH_TOKEN_TTL_MS;
  }
}
