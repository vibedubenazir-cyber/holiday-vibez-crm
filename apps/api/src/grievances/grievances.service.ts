import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { CreateGrievanceDto, UpdateGrievanceDto } from './dto/grievance.dto';

@Injectable()
export class GrievancesService {
  constructor(private readonly prisma: PrismaService) {}

  create(userId: string, dto: CreateGrievanceDto) {
    return this.prisma.grievanceReport.create({
      data: { userId, category: dto.category, description: dto.description, against: dto.against },
    });
  }

  // Submitter only ever sees their own status/resolution — never anyone
  // else's report content.
  findMine(userId: string) {
    return this.prisma.grievanceReport.findMany({ where: { userId }, orderBy: { createdAt: 'desc' } });
  }

  // No branchId parameter by design — never scope this to a branch, since a
  // POSH complaint may be about that branch's own manager. Visibility is
  // enforced at the controller level to Admin/Director only.
  findAll() {
    return this.prisma.grievanceReport.findMany({
      include: {
        user: { select: { name: true, branchId: true, branch: { select: { name: true } } } },
        handledBy: { select: { name: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async update(id: string, handledById: string, dto: UpdateGrievanceDto) {
    const report = await this.prisma.grievanceReport.findUnique({ where: { id } });
    if (!report) throw new NotFoundException('Report not found');
    return this.prisma.grievanceReport.update({
      where: { id },
      data: {
        status: dto.status ?? report.status,
        resolutionNotes: dto.resolutionNotes ?? report.resolutionNotes,
        handledById,
      },
    });
  }
}
