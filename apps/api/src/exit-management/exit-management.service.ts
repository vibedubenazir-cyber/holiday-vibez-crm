import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { ExitType } from '@prisma/client';
import { PrismaService } from '../prisma.service';
import { CreateExitRecordDto } from './dto/exit-record.dto';
import { AssetsService } from '../assets/assets.service';

@Injectable()
export class ExitManagementService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly assets: AssetsService,
  ) {}

  private async create(userId: string, type: ExitType, dto: CreateExitRecordDto) {
    const existing = await this.prisma.exitRecord.findUnique({ where: { userId } });
    if (existing) throw new BadRequestException('An exit record already exists for this employee');
    return this.prisma.exitRecord.create({
      data: {
        userId,
        type,
        noticeDate: new Date(dto.noticeDate),
        lastWorkingDate: new Date(dto.lastWorkingDate),
        reason: dto.reason,
      },
    });
  }

  resign(userId: string, dto: CreateExitRecordDto) {
    return this.create(userId, 'RESIGNATION', dto);
  }

  terminate(userId: string, dto: CreateExitRecordDto) {
    return this.create(userId, 'TERMINATION', dto);
  }

  findMine(userId: string) {
    return this.prisma.exitRecord.findUnique({ where: { userId } });
  }

  findAll(filter: { branchId?: string }) {
    return this.prisma.exitRecord.findMany({
      where: { user: filter.branchId ? { branchId: filter.branchId } : undefined },
      include: { user: { select: { id: true, name: true, role: true, branchId: true } } },
      orderBy: { createdAt: 'desc' },
    });
  }

  // Clearing an exit is the formal "offboarding complete" action, so it also
  // deactivates the account — matches how the rest of this app treats
  // UserStatus.INACTIVE (no separate "exited" flag).
  async clear(id: string, clearedById: string, notes: string | undefined) {
    const record = await this.prisma.exitRecord.findUnique({ where: { id } });
    if (!record) throw new NotFoundException('Exit record not found');
    if (record.status === 'CLEARED') throw new BadRequestException('This exit has already been cleared');
    if (record.userId === clearedById) {
      throw new BadRequestException('You cannot clear your own exit record');
    }

    // Clearance is the point of no return — it deactivates the account, after
    // which nobody is chasing the leaver for the laptop. Block it while
    // company property is still outstanding, and name what's missing.
    const outstanding = await this.assets.outstandingFor(record.userId);
    if (outstanding.length > 0) {
      const list = outstanding.map((a) => `${a.assetTag} (${a.name})`).join(', ');
      throw new BadRequestException(
        `Cannot clear this exit — ${outstanding.length} asset(s) still assigned: ${list}. Mark them returned first.`,
      );
    }

    await this.prisma.user.update({ where: { id: record.userId }, data: { status: 'INACTIVE' } });
    return this.prisma.exitRecord.update({
      where: { id },
      data: { status: 'CLEARED', clearedById, clearedAt: new Date(), exitInterviewNotes: notes ?? record.exitInterviewNotes },
    });
  }
}
