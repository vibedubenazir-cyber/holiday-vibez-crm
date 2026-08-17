import { UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { authenticator } from 'otplib';
import { AuthService } from './auth.service';
import { PrismaService } from '../prisma.service';

// Regression tests for the 2FA/session defects found in the Aug-2026 QA audit.
// Each `it()` below fails if its specific bug is reintroduced.
//
// These are unit tests over a mocked Prisma: every bug here is a guard in
// service logic, so exercising the guard directly is both sufficient and far
// faster than standing up a database.

const JWT_SECRET = 'test-secret';

function makeUser(overrides: Record<string, unknown> = {}) {
  return {
    id: 'user-1',
    email: 'consultant@holidayvibez.com',
    name: 'Test User',
    role: 'TRAVEL_CONSULTANT',
    branchId: 'branch-1',
    status: 'ACTIVE',
    passwordHash: 'irrelevant',
    twoFactorEnabled: true,
    twoFactorSecret: authenticator.generateSecret(),
    ...overrides,
  };
}

describe('AuthService — 2FA and session regressions', () => {
  let service: AuthService;
  let prisma: {
    user: { findUnique: jest.Mock; update: jest.Mock };
    session: { findFirst: jest.Mock; update: jest.Mock; create: jest.Mock };
  };
  let jwtService: JwtService;

  beforeEach(() => {
    process.env.JWT_SECRET = JWT_SECRET;
    prisma = {
      user: { findUnique: jest.fn(), update: jest.fn() },
      session: { findFirst: jest.fn(), update: jest.fn(), create: jest.fn() },
    };
    jwtService = new JwtService({ secret: JWT_SECRET });
    service = new AuthService(prisma as unknown as PrismaService, jwtService);
  });

  // BUG 1 — verifyTwoFactor() used to accept a raw `userId` straight from the
  // client, so knowing (or guessing) a user id was enough to complete the
  // second factor without ever having passed the password check.
  describe('verifyTwoFactor() requires a signed challenge token', () => {
    it('rejects a raw user id passed where the challenge token belongs', async () => {
      const user = makeUser();
      prisma.user.findUnique.mockResolvedValue(user);
      const validCode = authenticator.generate(user.twoFactorSecret as string);

      await expect(
        service.verifyTwoFactor(user.id, validCode, 'device', '1.2.3.4'),
      ).rejects.toBeInstanceOf(UnauthorizedException);

      // The bug's signature: it would have looked the user up and issued a
      // session. A correct implementation bails before touching the database.
      expect(prisma.session.create).not.toHaveBeenCalled();
    });

    it('rejects a token signed for a different purpose', async () => {
      const user = makeUser();
      prisma.user.findUnique.mockResolvedValue(user);
      // An ordinary access token — correctly signed, wrong purpose. Without
      // the purpose check an attacker could present any token we ever issue.
      const accessToken = jwtService.sign(
        { sub: user.id, role: user.role },
        { secret: JWT_SECRET, expiresIn: '15m' },
      );
      const validCode = authenticator.generate(user.twoFactorSecret as string);

      await expect(
        service.verifyTwoFactor(accessToken, validCode, 'device', '1.2.3.4'),
      ).rejects.toBeInstanceOf(UnauthorizedException);
      expect(prisma.session.create).not.toHaveBeenCalled();
    });

    it('rejects an expired challenge token', async () => {
      const user = makeUser();
      prisma.user.findUnique.mockResolvedValue(user);
      const expired = jwtService.sign(
        { sub: user.id, purpose: 'login-2fa-challenge' },
        { secret: JWT_SECRET, expiresIn: '-1s' },
      );
      const validCode = authenticator.generate(user.twoFactorSecret as string);

      await expect(
        service.verifyTwoFactor(expired, validCode, 'device', '1.2.3.4'),
      ).rejects.toBeInstanceOf(UnauthorizedException);
    });

    it('accepts a valid challenge token with a valid code', async () => {
      const user = makeUser();
      prisma.user.findUnique.mockResolvedValue(user);
      prisma.session.create.mockResolvedValue({ id: 'session-1' });
      const challenge = jwtService.sign(
        { sub: user.id, purpose: 'login-2fa-challenge' },
        { secret: JWT_SECRET, expiresIn: '5m' },
      );
      const validCode = authenticator.generate(user.twoFactorSecret as string);

      const result = await service.verifyTwoFactor(challenge, validCode, 'device', '1.2.3.4');

      expect(result).toHaveProperty('accessToken');
      expect(prisma.session.create).toHaveBeenCalled();
    });

    it('still rejects a wrong TOTP code even with a valid challenge token', async () => {
      const user = makeUser();
      prisma.user.findUnique.mockResolvedValue(user);
      const challenge = jwtService.sign(
        { sub: user.id, purpose: 'login-2fa-challenge' },
        { secret: JWT_SECRET, expiresIn: '5m' },
      );

      await expect(
        service.verifyTwoFactor(challenge, '000000', 'device', '1.2.3.4'),
      ).rejects.toBeInstanceOf(UnauthorizedException);
      expect(prisma.session.create).not.toHaveBeenCalled();
    });
  });

  // BUG 5 — disableTwoFactor() used to need only a valid access token, so a
  // single stolen/leaked session could permanently strip an account's 2FA
  // rather than merely acting inside its 15-minute window.
  describe('disableTwoFactor() requires a current TOTP code', () => {
    it('refuses to disable without a valid code', async () => {
      const user = makeUser();
      prisma.user.findUnique.mockResolvedValue(user);

      await expect(service.disableTwoFactor(user.id, '000000')).rejects.toBeInstanceOf(
        UnauthorizedException,
      );
      expect(prisma.user.update).not.toHaveBeenCalled();
    });

    it('disables when the current code is supplied', async () => {
      const user = makeUser();
      prisma.user.findUnique.mockResolvedValue(user);
      prisma.user.update.mockResolvedValue({});
      const validCode = authenticator.generate(user.twoFactorSecret as string);

      await expect(service.disableTwoFactor(user.id, validCode)).resolves.toEqual({ success: true });
      expect(prisma.user.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: { twoFactorEnabled: false, twoFactorSecret: null },
        }),
      );
    });
  });

  // BUG 6 — refresh() returned a new access token but left the refresh token
  // untouched, so a token that leaked stayed valid for its full 30-day life.
  describe('refresh() rotates the refresh token', () => {
    it('issues a different refresh token and invalidates the old hash', async () => {
      const oldToken = 'a'.repeat(96);
      const user = makeUser();
      prisma.session.findFirst.mockResolvedValue({
        id: 'session-1',
        createdAt: new Date(),
        user,
      });
      prisma.session.update.mockResolvedValue({});

      const result = await service.refresh(oldToken);

      expect(result.refreshToken).toBeDefined();
      expect(result.refreshToken).not.toEqual(oldToken);

      // The stored hash must be replaced — that is what actually retires the
      // old token. Asserting only on the returned value would pass even if
      // the database still accepted the leaked one.
      expect(prisma.session.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'session-1' },
          data: expect.objectContaining({ refreshTokenHash: expect.any(String) }),
        }),
      );
      const storedHash = prisma.session.update.mock.calls[0][0].data.refreshTokenHash;
      const oldHash = (service as unknown as { hashToken(t: string): string }).hashToken(oldToken);
      expect(storedHash).not.toEqual(oldHash);
    });

    it('rejects an unknown refresh token', async () => {
      prisma.session.findFirst.mockResolvedValue(null);
      await expect(service.refresh('nope')).rejects.toBeInstanceOf(UnauthorizedException);
    });
  });
});
