import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { CreateTravelerDto } from './dto/traveler.dto';
import { decryptField, encryptField } from '../common/crypto.util';

@Injectable()
export class TravelersService {
  constructor(private readonly prisma: PrismaService) {}

  async findByLead(leadId: string) {
    const travelers = await this.prisma.traveler.findMany({ where: { leadId } });
    return travelers.map((t) => ({
      ...t,
      passportNumber: t.passportNumberEnc ? this.safeDecrypt(t.passportNumberEnc) : null,
      passportNumberEnc: undefined,
    }));
  }

  create(leadId: string, dto: CreateTravelerDto) {
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

  private safeDecrypt(value: string): string | null {
    try {
      return decryptField(value);
    } catch {
      return null;
    }
  }
}
