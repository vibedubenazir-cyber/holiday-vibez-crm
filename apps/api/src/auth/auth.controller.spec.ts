import 'reflect-metadata';
import { AuthController } from './auth.controller';
import { RateLimitGuard } from '../common/guards/rate-limit.guard';

// BUG 2 — /auth/login and /auth/2fa/verify had no throttling, so passwords
// and 6-digit TOTP codes (a 1,000,000-key space, minutes to exhaust
// unthrottled) could be brute-forced at will.
//
// The guard's own behaviour is not re-tested here; what regressed was it not
// being *applied*. This asserts the wiring, which is the part that broke.
describe('AuthController — brute-force protection', () => {
  const guardsFor = (method: string): unknown[] =>
    Reflect.getMetadata('__guards__', (AuthController.prototype as never)[method]) ?? [];

  it('rate-limits the login endpoint', () => {
    expect(guardsFor('login')).toContain(RateLimitGuard);
  });

  it('rate-limits the 2FA verify endpoint', () => {
    expect(guardsFor('verifyTwoFactor')).toContain(RateLimitGuard);
  });
});
