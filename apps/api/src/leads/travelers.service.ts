import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { Role } from '@prisma/client';
import { PrismaService } from '../prisma.service';
import { CreateTravelerDto } from './dto/traveler.dto';
import { decryptField, encryptField } from '../common/crypto.util';

type Actor = { id: string; role: Role; branchId: string | null };

@Injectable()
export class TravelersService {
  constructor(private readonly prisma: PrismaService) {}

  async findByLead(leadId: string, actor: Actor) {
    await this.assertLeadScope(leadId, actor);
    const travelers = await this.prisma.traveler.findMany({ where: { leadId } });
    return travelers.map((t) => ({
      ...t,
      passportNumber: t.passportNumberEnc ? this.safeDecrypt(t.passportNumberEnc) : null,
      passportNumberEnc: undefined,
    }));
  }

  async create(leadId: string, dto: CreateTravelerDto, actor: Actor) {
    await this.assertLeadScope(leadId, actor);
    return this.prisma.traveler.create({
      data: {
        leadId,
        name: dto.name,
        phone: dto.phone,
        email: dto.email,
        passportNumberEnc: dto.passportNumber ? encryptField(dto.passportNumber) : undefined,
        passportExpiry: dto.passportExpiry ? new Date(dto.passportExpiry) : undefined,
        visaStatus: dto.visaStatus,
        insurancePolicyNo: dto.insurancePolicyNo,
      },
    });
  }

  private async assertLeadScope(leadId: string, actor: Actor) {
    const lead = await this.prisma.lead.findUnique({ where: { id: leadId } });
    if (!lead) throw new NotFoundException('Lead not found');
    if (actor.role === Role.TRAVEL_CONSULTANT && actor.id !== lead.assignedConsultantId) {
      throw new ForbiddenException('You can only access travelers for your own leads');
    }
    if (actor.role === Role.BRANCH_MANAGER && actor.branchId !== lead.branchId) {
      throw new ForbiddenException("You can only access travelers for your own branch's leads");
    }
  }

  private safeDecrypt(value: string): string | null {
    try {
      return decryptField(value);
    } catch {
      return null;
    }
  }
}
