import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { Role, TicketStatus } from '@prisma/client';
import { PrismaService } from '../prisma.service';
import { CreateHrTicketDto, UpdateHrTicketDto } from './dto/hr-ticket.dto';

type Actor = { id: string; role: Role };
const MANAGE_ROLES: Role[] = [Role.DIRECTOR, Role.ADMIN, Role.BRANCH_MANAGER];

@Injectable()
export class HrHelpdeskService {
  constructor(private readonly prisma: PrismaService) {}

  create(userId: string, dto: CreateHrTicketDto) {
    return this.prisma.hrTicket.create({
      data: {
        userId,
        category: dto.category,
        subject: dto.subject,
        description: dto.description,
        priority: dto.priority ?? 'MEDIUM',
      },
    });
  }

  findMine(userId: string) {
    return this.prisma.hrTicket.findMany({ where: { userId }, orderBy: { createdAt: 'desc' } });
  }

  findAll(filter: { branchId?: string; status?: TicketStatus }) {
    return this.prisma.hrTicket.findMany({
      where: { status: filter.status, user: filter.branchId ? { branchId: filter.branchId } : undefined },
      include: { user: { select: { name: true, branchId: true } }, assignedTo: { select: { name: true } } },
      orderBy: { createdAt: 'desc' },
    });
  }

  async update(id: string, dto: UpdateHrTicketDto, actor: Actor) {
    const ticket = await this.prisma.hrTicket.findUnique({ where: { id } });
    if (!ticket) throw new NotFoundException('Ticket not found');
    const isManager = MANAGE_ROLES.includes(actor.role);
    const isAssignee = ticket.assignedToId === actor.id;
    if (!isManager && !isAssignee) {
      throw new ForbiddenException('Only a manager or the assigned agent can update this ticket');
    }
    return this.prisma.hrTicket.update({
      where: { id },
      data: {
        status: dto.status ?? ticket.status,
        priority: isManager ? dto.priority ?? ticket.priority : ticket.priority,
        assignedToId: isManager ? dto.assignedToId ?? ticket.assignedToId : ticket.assignedToId,
        resolutionNote: dto.resolutionNote ?? ticket.resolutionNote,
      },
    });
  }
}
