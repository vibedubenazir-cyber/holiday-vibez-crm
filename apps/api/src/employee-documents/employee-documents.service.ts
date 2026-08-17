import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { Role } from '@prisma/client';
import { PrismaService } from '../prisma.service';
import { CreateEmployeeDocumentDto } from './dto/employee-document.dto';

type Actor = { id: string; role: Role; branchId: string | null };

// Staff ID documents are among the most sensitive rows in the database —
// Aadhaar and PAN numbers, scanned contracts. Read access is deliberately
// narrower than the rest of HRMS: your own, or HR/Director. A Branch Manager
// gets their branch, matching how they can already see branch payroll.
@Injectable()
export class EmployeeDocumentsService {
  constructor(private readonly prisma: PrismaService) {}

  private async assertCanView(actor: Actor, ownerId: string) {
    if (actor.id === ownerId) return;
    if (actor.role === Role.DIRECTOR || actor.role === Role.ADMIN) return;
    if (actor.role === Role.BRANCH_MANAGER) {
      const owner = await this.prisma.user.findUnique({ where: { id: ownerId }, select: { branchId: true } });
      if (owner && owner.branchId === actor.branchId) return;
    }
    throw new ForbiddenException("You cannot view this employee's documents");
  }

  async findForUser(userId: string, actor: Actor) {
    await this.assertCanView(actor, userId);
    return this.prisma.employeeDocument.findMany({
      where: { userId },
      orderBy: [{ type: 'asc' }, { createdAt: 'desc' }],
    });
  }

  async create(dto: CreateEmployeeDocumentDto, actor: Actor) {
    await this.assertCanView(actor, dto.userId);
    const owner = await this.prisma.user.findUnique({ where: { id: dto.userId } });
    if (!owner) throw new NotFoundException('Employee not found');

    return this.prisma.employeeDocument.create({
      data: {
        userId: dto.userId,
        type: dto.type,
        title: dto.title,
        fileUrl: dto.fileUrl,
        number: dto.number,
        issuedOn: dto.issuedOn ? new Date(dto.issuedOn) : undefined,
        expiresOn: dto.expiresOn ? new Date(dto.expiresOn) : undefined,
        uploadedById: actor.id,
      },
    });
  }

  async remove(id: string, actor: Actor) {
    const doc = await this.prisma.employeeDocument.findUnique({ where: { id } });
    if (!doc) throw new NotFoundException('Document not found');
    await this.assertCanView(actor, doc.userId);
    await this.prisma.employeeDocument.delete({ where: { id } });
    return { success: true };
  }

  // Mirrors the traveler passport/visa expiry report already on the CRM side:
  // staff documents expire too, and an expired contract or ID is a compliance
  // problem nobody was being told about.
  async expiring(withinDays: number, branchId?: string) {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() + withinDays);
    return this.prisma.employeeDocument.findMany({
      where: {
        expiresOn: { not: null, lte: cutoff },
        user: branchId ? { branchId } : undefined,
      },
      include: { user: { select: { id: true, name: true, employeeCode: true, branchId: true } } },
      orderBy: { expiresOn: 'asc' },
    });
  }
}
