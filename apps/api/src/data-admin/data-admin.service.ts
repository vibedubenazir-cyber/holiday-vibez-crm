import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma.service';

@Injectable()
export class DataAdminService {
  constructor(private readonly prisma: PrismaService) {}

  findAuditLogs(filter: { entity?: string; userId?: string; page?: number; pageSize?: number }) {
    const page = filter.page ?? 1;
    const pageSize = Math.min(filter.pageSize ?? 50, 200);

    return this.prisma.auditLog.findMany({
      where: {
        entity: filter.entity ? { contains: filter.entity, mode: 'insensitive' } : undefined,
        userId: filter.userId,
      },
      include: { user: { select: { id: true, name: true, email: true, role: true } } },
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * pageSize,
      take: pageSize,
    });
  }

  async stats() {
    const [users, leads, quotations, bookings, payments, auditLogs, cmsContent, currencyRates] = await Promise.all([
      this.prisma.user.count(),
      this.prisma.lead.count(),
      this.prisma.quotation.count(),
      this.prisma.booking.count(),
      this.prisma.payment.count(),
      this.prisma.auditLog.count(),
      this.prisma.cmsContent.count(),
      this.prisma.currencyRate.count(),
    ]);
    return { users, leads, quotations, bookings, payments, auditLogs, cmsContent, currencyRates };
  }
}
