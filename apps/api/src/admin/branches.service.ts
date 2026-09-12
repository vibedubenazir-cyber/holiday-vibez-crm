import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { CreateBranchDto, UpdateBranchDto } from './dto/branch.dto';

@Injectable()
export class BranchesService {
  constructor(private readonly prisma: PrismaService) {}

  findAll() {
    return this.prisma.branch.findMany({ orderBy: { name: 'asc' } });
  }

  create(dto: CreateBranchDto) {
    return this.prisma.branch.create({
      data: {
        name: dto.name,
        city: dto.city,
        monthlyTarget: dto.monthlyTarget ?? 0,
        quarterlyTarget: dto.quarterlyTarget ?? 0,
      },
    });
  }

  async update(id: string, dto: UpdateBranchDto) {
    const branch = await this.prisma.branch.findUnique({ where: { id } });
    if (!branch) throw new NotFoundException('Branch not found');
    return this.prisma.branch.update({ where: { id }, data: dto });
  }

  // Permanently removes a test/demo branch. Refuses if it still has any
  // Leads, Expenses, PettyCashEntries, Budgets, or assigned staff — those
  // are required (non-nullable) FKs pointing at Branch, and reassigning
  // real people/records is a business decision, not something to silently
  // clear. Every other Branch reference is optional/org-wide-capable and
  // gets detached instead of blocking the delete.
  async purgeBranch(id: string) {
    const branch = await this.prisma.branch.findUnique({ where: { id } });
    if (!branch) throw new NotFoundException('Branch not found');

    const p = this.prisma;
    const ownershipCounts: [string, number][] = await Promise.all([
      p.lead.count({ where: { branchId: id } }).then((n): [string, number] => ['Lead', n]),
      p.expense.count({ where: { branchId: id } }).then((n): [string, number] => ['Expense', n]),
      p.pettyCashEntry.count({ where: { branchId: id } }).then((n): [string, number] => ['Petty cash entry', n]),
      p.budget.count({ where: { branchId: id } }).then((n): [string, number] => ['Budget', n]),
      p.user.count({ where: { branchId: id } }).then((n): [string, number] => ['Staff assigned', n]),
    ]);
    const blockers = ownershipCounts.filter(([, n]) => n > 0).map(([label, n]) => `${label} (${n})`);
    if (blockers.length > 0) {
      throw new BadRequestException(`Cannot delete — this branch still has: ${blockers.join(', ')}. Reassign or remove those first.`);
    }

    await p.$transaction(async (tx) => {
      await tx.target.updateMany({ where: { branchId: id }, data: { branchId: null } });
      await tx.campaign.updateMany({ where: { audienceBranchId: id }, data: { audienceBranchId: null } });
      await tx.teamChannel.updateMany({ where: { branchId: id }, data: { branchId: null } });
      await tx.bankTransaction.updateMany({ where: { branchId: id }, data: { branchId: null } });
      await tx.holiday.updateMany({ where: { branchId: id }, data: { branchId: null } });
      await tx.shift.updateMany({ where: { branchId: id }, data: { branchId: null } });
      await tx.asset.updateMany({ where: { branchId: id }, data: { branchId: null } });
      await tx.marketingOccasion.updateMany({ where: { audienceBranchId: id }, data: { audienceBranchId: null } });
      await tx.branch.delete({ where: { id } });
    });

    return { success: true };
  }
}
