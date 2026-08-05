import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  Post,
  Req,
  Res,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { ConfirmTwoFactorDto, VerifyTwoFactorDto } from './dto/two-factor.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { toUserDto } from '../admin/dto/user.mapper';

const REFRESH_COOKIE = 'hv_refresh';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('login')
  @HttpCode(200)
  async login(@Body() dto: LoginDto, @Req() req: Request, @Res({ passthrough: true }) res: Response) {
    const deviceInfo = req.headers['user-agent'] ?? 'unknown device';
    const ip = req.ip ?? 'unknown';
    const result = await this.authService.login(dto.email, dto.password, deviceInfo, ip);

    if (result.requiresTwoFactor) {
      return { requiresTwoFactor: true, userId: result.userId };
    }

    res.cookie(REFRESH_COOKIE, result.refreshToken, {
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      maxAge: 30 * 24 * 60 * 60 * 1000,
      path: '/api/auth',
    });

    return { accessToken: result.accessToken, user: toUserDto(result.user) };
  }

  @Post('2fa/verify')
  @HttpCode(200)
  async verifyTwoFactor(@Body() dto: VerifyTwoFactorDto, @Req() req: Request, @Res({ passthrough: true }) res: Response) {
    const deviceInfo = req.headers['user-agent'] ?? 'unknown device';
    const ip = req.ip ?? 'unknown';
    const result = await this.authService.verifyTwoFactor(dto.userId, dto.code, deviceInfo, ip);

    res.cookie(REFRESH_COOKIE, result.refreshToken, {
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      maxAge: 30 * 24 * 60 * 60 * 1000,
      path: '/api/auth',
    });

    return { accessToken: result.accessToken, user: toUserDto(result.user) };
  }

  @UseGuards(JwtAuthGuard)
  @Post('2fa/setup')
  setupTwoFactor(@CurrentUser() user: { id: string; email: string }) {
    return this.authService.setupTwoFactor(user.id, user.email);
  }

  @UseGuards(JwtAuthGuard)
  @Post('2fa/confirm')
  confirmTwoFactor(@CurrentUser() user: { id: string }, @Body() dto: ConfirmTwoFactorDto) {
    return this.authService.confirmTwoFactor(user.id, dto.code);
  }

  @UseGuards(JwtAuthGuard)
  @Post('2fa/disable')
  disableTwoFactor(@CurrentUser() user: { id: string }) {
    return this.authService.disableTwoFactor(user.id);
  }

  @Post('refresh')
  @HttpCode(200)
  async refresh(@Req() req: Request) {
    const refreshToken = req.cookies?.[REFRESH_COOKIE];
    if (!refreshToken) {
      throw new UnauthorizedException('Missing refresh token');
    }
    const { user, accessToken } = await this.authService.refresh(refreshToken);
    return { accessToken, user: toUserDto(user) };
  }

  @Post('logout')
  @HttpCode(200)
  async logout(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
    const refreshToken = req.cookies?.[REFRESH_COOKIE];
    if (refreshToken) {
      await this.authService.logout(refreshToken);
    }
    res.clearCookie(REFRESH_COOKIE, { path: '/api/auth' });
    return { success: true };
  }

  @UseGuards(JwtAuthGuard)
  @Get('sessions')
  async sessions(@CurrentUser() user: { id: string }, @Req() req: Request) {
    const refreshToken = req.cookies?.[REFRESH_COOKIE];
    return this.authService.listSessions(user.id, refreshToken);
  }

  @UseGuards(JwtAuthGuard)
  @Delete('sessions/:id')
  async revokeSession(@CurrentUser() user: { id: string }, @Param('id') id: string) {
    await this.authService.revokeSession(user.id, id);
    return { success: true };
  }
}
