import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { Role } from '@prisma/client';
import { PrismaService } from '../prisma.service';
import { CreateTicketDto } from './dto/create-ticket.dto';
import { UpdateTicketDto } from './dto/update-ticket.dto';

type Actor = { id: string; role: Role };
const MANAGE_ROLES: Role[] = [Role.DIRECTOR, Role.ADMIN, Role.BRANCH_MANAGER];

@Injectable()
export class SupportTicketsService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(status?: string) {
    return this.prisma.supportTicket.findMany({
      where: status ? { status: status as any } : undefined,
      include: { lead: true, assignedTo: { select: { id: true, name: true } } },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findMine(userId: string) {
    return this.prisma.supportTicket.findMany({
      where: { assignedToId: userId },
      include: { lead: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: string) {
    const ticket = await this.prisma.supportTicket.findUnique({
      where: { id },
      include: { lead: true, assignedTo: { select: { id: true, name: true } } },
    });
    if (!ticket) throw new NotFoundException('Ticket not found');
    return ticket;
  }

  async create(leadId: string, dto: CreateTicketDto, createdBy: string) {
    const lead = await this.prisma.lead.findUnique({ where: { id: leadId } });
    if (!lead) throw new NotFoundException('Lead not found');
    return this.prisma.supportTicket.create({
      data: {
        leadId,
        subject: dto.subject,
        description: dto.description,
        priority: dto.priority ?? 'MEDIUM',
        assignedToId: dto.assignedToId,
        createdBy,
      },
    });
  }

  async update(id: string, dto: UpdateTicketDto, actor: Actor) {
    const ticket = await this.prisma.supportTicket.findUnique({ where: { id } });
    if (!ticket) throw new NotFoundException('Ticket not found');
    const isManager = MANAGE_ROLES.includes(actor.role);
    const isAssignee = ticket.assignedToId === actor.id;
    if (!isManager && !isAssignee) {
      throw new ForbiddenException('Only a manager or the assigned agent can update this ticket');
    }
    return this.prisma.supportTicket.update({
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
