import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { CreateSupplierDto, UpdateSupplierDto } from './dto/supplier.dto';

@Injectable()
export class SuppliersService {
  constructor(private readonly prisma: PrismaService) {}

  // Outstanding balance is derived from unpaid Payments linked to the supplier
  // (Payment.supplierId, set when a consultant links a vendor bill at payment
  // creation) rather than stored on Supplier — it's always in sync with the
  // real payables ledger and never drifts.
  async findAll() {
    const [suppliers, unpaid] = await Promise.all([
      this.prisma.supplier.findMany({ orderBy: { name: 'asc' } }),
      this.prisma.payment.groupBy({
        by: ['supplierId'],
        where: { supplierId: { not: null }, paidAt: null },
        _sum: { amount: true },
      }),
    ]);
    const outstandingBySupplier = new Map(unpaid.map((u) => [u.supplierId as string, Number(u._sum.amount ?? 0)]));
    return suppliers.map((s) => ({ ...s, outstandingBalance: outstandingBySupplier.get(s.id) ?? 0 }));
  }

  create(dto: CreateSupplierDto) {
    return this.prisma.supplier.create({ data: dto });
  }

  async update(id: string, dto: UpdateSupplierDto) {
    const existing = await this.prisma.supplier.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Supplier not found');
    return this.prisma.supplier.update({ where: { id }, data: dto });
  }
}
