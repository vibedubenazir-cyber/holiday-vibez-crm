import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { Role } from '@prisma/client';
import * as bcrypt from 'bcryptjs';
import { PrismaService } from '../prisma.service';
import { CreateUserDto, UpdateUserDto } from './dto/user.dto';
import { toUserDto } from './dto/user.mapper';

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll() {
    const users = await this.prisma.user.findMany({ orderBy: { createdAt: 'asc' } });
    return users.map(toUserDto);
  }

  async create(dto: CreateUserDto) {
    const passwordHash = await bcrypt.hash(dto.password, 10);
    const user = await this.prisma.user.create({
      data: {
        name: dto.name,
        email: dto.email,
        phone: dto.phone,
        passwordHash,
        role: dto.role,
        branchId: dto.branchId ?? null,
      },
    });
    return toUserDto(user);
  }

  async update(id: string, dto: UpdateUserDto) {
    await this.ensureExists(id);
    const user = await this.prisma.user.update({ where: { id }, data: dto });
    return toUserDto(user);
  }

  async deactivate(id: string) {
    await this.ensureExists(id);
    const user = await this.prisma.user.update({ where: { id }, data: { status: 'INACTIVE' } });
    return toUserDto(user);
  }

  // Permanently removes a deactivated test/demo account and its own
  // footprint (attendance, leave, payslips, LMS enrollments, chat
  // membership, sessions, ...). Refuses if the account still owns real
  // business records through a required (non-nullable) field — e.g. a
  // Quotation.consultantId or a HrTicket they raised — since forcing that
  // would either fail on a DB constraint or silently destroy someone
  // else's real data. Nullable reference fields (assignedToId, reviewerId,
  // etc.) are cleared instead of blocking, the same way removing a real
  // employee via Exit Management leaves their past records intact.
  async purge(id: string) {
    const user = await this.ensureExists(id);
    if (user.status !== 'INACTIVE') {
      throw new BadRequestException('Deactivate this user before purging it');
    }
    if (user.role === Role.DIRECTOR || user.role === Role.ADMIN) {
      throw new ForbiddenException('Director/Admin accounts cannot be purged from this endpoint');
    }

    const p = this.prisma;
    const ownershipCounts: [string, number][] = await Promise.all([
      p.quotation.count({ where: { consultantId: id } }).then((n): [string, number] => ['Quotation authored', n]),
      p.leadNote.count({ where: { authorId: id } }).then((n): [string, number] => ['LeadNote authored', n]),
      p.leadReminder.count({ where: { assignedToId: id } }).then((n): [string, number] => ['LeadReminder assigned', n]),
      p.hrTicket.count({ where: { userId: id } }).then((n): [string, number] => ['HrTicket raised', n]),
      p.grievanceReport.count({ where: { userId: id } }).then((n): [string, number] => ['GrievanceReport raised', n]),
      p.employeeDocument.count({ where: { userId: id } }).then((n): [string, number] => ['EmployeeDocument owned', n]),
      p.onboardingTask.count({ where: { userId: id } }).then((n): [string, number] => ['OnboardingTask owned', n]),
      p.appraisal.count({ where: { userId: id } }).then((n): [string, number] => ['Appraisal owned', n]),
      p.itineraryPlan.count({ where: { createdById: id } }).then((n): [string, number] => ['ItineraryPlan authored', n]),
      p.rosterEntry.count({ where: { userId: id } }).then((n): [string, number] => ['Roster entries owned', n]),
      p.employeeDocument
        .count({ where: { uploadedById: id, userId: { not: id } } })
        .then((n): [string, number] => ['EmployeeDocument uploaded for others', n]),
      p.performanceReview
        .count({ where: { reviewerId: id, userId: { not: id } } })
        .then((n): [string, number] => ['PerformanceReview authored for others', n]),
    ]);
    const blockers = ownershipCounts.filter(([, n]) => n > 0).map(([label, n]) => `${label} (${n})`);

    if (blockers.length > 0) {
      throw new BadRequestException(
        `Cannot purge — this account still owns real records: ${blockers.join(', ')}. Reassign or remove those first.`,
      );
    }

    await p.$transaction(async (tx) => {
      // Clear stale optional references rather than deleting the records they sit on.
      await tx.user.updateMany({ where: { reportsToId: id }, data: { reportsToId: null } });
      await tx.branch.updateMany({ where: { managerId: id }, data: { managerId: null } });
      await tx.lead.updateMany({ where: { assignedConsultantId: id }, data: { assignedConsultantId: null } });
      await tx.quotation.updateMany({ where: { approvedById: id }, data: { approvedById: null } });
      await tx.supportTicket.updateMany({ where: { assignedToId: id }, data: { assignedToId: null } });
      await tx.hrTicket.updateMany({ where: { assignedToId: id }, data: { assignedToId: null } });
      await tx.grievanceReport.updateMany({ where: { handledById: id }, data: { handledById: null } });
      await tx.asset.updateMany({ where: { assignedToId: id }, data: { assignedToId: null } });
      await tx.onboardingTask.updateMany({ where: { completedById: id }, data: { completedById: null } });
      await tx.appraisal.updateMany({ where: { managerId: id }, data: { managerId: null } });
      await tx.message.updateMany({ where: { sentBy: id }, data: { sentBy: null } });
      await tx.attendanceRegularisation.updateMany({ where: { reviewedById: id }, data: { reviewedById: null } });
      await tx.leaveRequest.updateMany({ where: { reviewedById: id }, data: { reviewedById: null } });
      await tx.reimbursementClaim.updateMany({ where: { reviewedById: id }, data: { reviewedById: null } });
      await tx.auditLog.updateMany({ where: { userId: id }, data: { userId: null } });

      // Delete this user's own footprint.
      const enrollments = await tx.enrollment.findMany({ where: { userId: id }, select: { id: true } });
      const enrollmentIds = enrollments.map((e) => e.id);
      if (enrollmentIds.length) {
        await tx.certificate.deleteMany({ where: { enrollmentId: { in: enrollmentIds } } });
        await tx.quizAttempt.deleteMany({ where: { enrollmentId: { in: enrollmentIds } } });
        await tx.lessonProgress.deleteMany({ where: { enrollmentId: { in: enrollmentIds } } });
        await tx.enrollment.deleteMany({ where: { id: { in: enrollmentIds } } });
      }
      await tx.attendanceRegularisation.deleteMany({ where: { userId: id } });
      await tx.attendance.deleteMany({ where: { userId: id } });
      await tx.leaveRequest.deleteMany({ where: { userId: id } });
      await tx.payslip.deleteMany({ where: { userId: id } });
      await tx.salaryStructure.deleteMany({ where: { userId: id } });
      await tx.performanceReview.deleteMany({ where: { userId: id } });
      await tx.reimbursementClaim.deleteMany({ where: { userId: id } });
      await tx.exitRecord.deleteMany({ where: { userId: id } });
      await tx.teamChannelMember.deleteMany({ where: { userId: id } });
      await tx.teamMessage.deleteMany({ where: { senderId: id } });
      await tx.session.deleteMany({ where: { userId: id } });

      await tx.user.delete({ where: { id } });
    });

    return { success: true };
  }

  private async ensureExists(id: string) {
    const user = await this.prisma.user.findUnique({ where: { id } });
    if (!user) throw new NotFoundException('User not found');
    return user;
  }
}
