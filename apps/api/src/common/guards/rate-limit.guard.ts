import { CanActivate, ExecutionContext, HttpException, HttpStatus, Injectable } from '@nestjs/common';

const WINDOW_MS = 60_000;
const MAX_REQUESTS_PER_WINDOW = 20;

/**
 * In-process rate limiter for the public lead-capture endpoint (spec Section 10).
 * Fine for a single-instance deployment; a multi-instance deployment needs a
 * shared store (Redis) instead — swap the Map for Redis INCR/EXPIRE at that point.
 */
@Injectable()
export class RateLimitGuard implements CanActivate {
  private hits = new Map<string, number[]>();

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const key = request.ip ?? 'unknown';
    const now = Date.now();
    const timestamps = (this.hits.get(key) ?? []).filter((t) => now - t < WINDOW_MS);
    timestamps.push(now);
    this.hits.set(key, timestamps);

    if (timestamps.length > MAX_REQUESTS_PER_WINDOW) {
      throw new HttpException('Too many requests, please try again shortly', HttpStatus.TOO_MANY_REQUESTS);
    }
    return true;
  }
}
