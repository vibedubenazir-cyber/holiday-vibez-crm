import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { UpdateEmployeeProfileDto } from './dto/employee.dto';
import { HrSettingsService, HR_SETTING_KEYS } from '../hr-settings/hr-settings.service';

const DEFAULT_PROBATION_DAYS = 90;

@Injectable()
export class EmployeesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly hrSettings: HrSettingsService,
  ) {}

  async directory(filter: { branchId?: string }) {
    const users = await this.prisma.user.findMany({
      where: { branchId: filter.branchId, status: 'ACTIVE' },
      include: { branch: { select: { name: true } }, reportsTo: { select: { id: true, name: true } } },
      orderBy: { name: 'asc' },
    });
    return users.map((u) => ({
      id: u.id,
      name: u.name,
      email: u.email,
      phone: u.phone,
      role: u.role,
      branchId: u.branchId,
      branchName: u.branch?.name ?? null,
      designation: u.designation,
      employeeCode: u.employeeCode,
      dateOfJoining: u.dateOfJoining,
      profilePhotoUrl: u.profilePhotoUrl,
      reportsToId: u.reportsToId,
      reportsToName: u.reportsTo?.name ?? null,
    }));
  }

  async orgChart() {
    const users = await this.prisma.user.findMany({
      where: { status: 'ACTIVE' },
      select: { id: true, name: true, role: true, designation: true, profilePhotoUrl: true, reportsToId: true },
      orderBy: { name: 'asc' },
    });
    type Node = (typeof users)[number] & { children: Node[] };
    const byId = new Map<string, Node>(users.map((u) => [u.id, { ...u, children: [] }]));
    const roots: Node[] = [];
    for (const node of byId.values()) {
      if (node.reportsToId && byId.has(node.reportsToId)) {
        byId.get(node.reportsToId)!.children.push(node);
      } else {
        roots.push(node);
      }
    }
    return roots;
  }

  async updateProfile(id: string, dto: UpdateEmployeeProfileDto) {
    const user = await this.prisma.user.findUnique({ where: { id } });
    if (!user) throw new NotFoundException('Employee not found');

    if (dto.reportsToId) {
      if (dto.reportsToId === id) throw new BadRequestException('An employee cannot report to themselves');
      // Walk the proposed manager's own chain of command to make sure
      // assigning them doesn't loop back to this employee.
      let cursor: string | null = dto.reportsToId;
      const seen = new Set<string>();
      while (cursor) {
        if (cursor === id) throw new BadRequestException('This would create a circular reporting chain');
        if (seen.has(cursor)) break;
        seen.add(cursor);
        const next: { reportsToId: string | null } | null = await this.prisma.user.findUnique({
          where: { id: cursor },
          select: { reportsToId: true },
        });
        cursor = next?.reportsToId ?? null;
      }
    }

    // Setting/changing the join date re-derives probationEndDate from the
    // org's configured probation period, so HR Settings actually drives the
    // Compliance Calendar's upcoming-probation-ends list rather than requiring
    // the date to be entered separately by hand.
    let probationEndDate: Date | undefined;
    if (dto.dateOfJoining) {
      const probationDays = await this.hrSettings.getNumber(HR_SETTING_KEYS.PROBATION_PERIOD_DAYS, DEFAULT_PROBATION_DAYS);
      probationEndDate = new Date(dto.dateOfJoining);
      probationEndDate.setDate(probationEndDate.getDate() + probationDays);
    }

    const updated = await this.prisma.user.update({
      where: { id },
      data: {
        designation: dto.designation,
        employeeCode: dto.employeeCode,
        dateOfJoining: dto.dateOfJoining ? new Date(dto.dateOfJoining) : undefined,
        probationEndDate,
        profilePhotoUrl: dto.profilePhotoUrl,
        emergencyContactName: dto.emergencyContactName,
        emergencyContactPhone: dto.emergencyContactPhone,
        reportsToId: dto.reportsToId,
      },
      include: { branch: { select: { name: true } }, reportsTo: { select: { id: true, name: true } } },
    });

    return {
      id: updated.id,
      name: updated.name,
      email: updated.email,
      phone: updated.phone,
      role: updated.role,
      branchId: updated.branchId,
      branchName: updated.branch?.name ?? null,
      designation: updated.designation,
      employeeCode: updated.employeeCode,
      dateOfJoining: updated.dateOfJoining,
      profilePhotoUrl: updated.profilePhotoUrl,
      reportsToId: updated.reportsToId,
      reportsToName: updated.reportsTo?.name ?? null,
    };
  }
}
