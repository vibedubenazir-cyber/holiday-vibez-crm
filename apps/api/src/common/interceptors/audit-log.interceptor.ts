import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { PrismaService } from '../../prisma.service';

const MUTATING_METHODS = new Set(['POST', 'PATCH', 'PUT', 'DELETE']);

@Injectable()
export class AuditLogInterceptor implements NestInterceptor {
  constructor(private readonly prisma: PrismaService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const request = context.switchToHttp().getRequest();
    const { method, url, user, body, ip } = request;

    if (!MUTATING_METHODS.has(method) || url.startsWith('/api/auth/login')) {
      return next.handle();
    }

    return next.handle().pipe(
      tap((result) => {
        this.prisma.auditLog
          .create({
            data: {
              userId: user?.id ?? null,
              action: `${method} ${url}`,
              entity: this.entityFromUrl(url),
              entityId: (result as { id?: string })?.id ?? null,
              afterValue: body ?? undefined,
              ipAddress: ip,
            },
          })
          .catch((err) => console.error('Failed to write audit log', err));
      }),
    );
  }

  private entityFromUrl(url: string): string {
    const parts = url.split('?')[0].split('/').filter(Boolean);
    return parts[1] ?? parts[0] ?? 'unknown';
  }
}
