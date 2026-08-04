import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { QuotationsService } from '../quotations/quotations.service';
import { AddPackageItemDto, CreatePackageDto, UpdatePackageDto } from './dto/package.dto';

@Injectable()
export class PackagesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly quotationsService: QuotationsService,
  ) {}

  findAll() {
    return this.prisma.package.findMany({
      where: { active: true },
      include: { items: { include: { rateCard: true } } },
      orderBy: { name: 'asc' },
    });
  }

  async findOne(id: string) {
    const pkg = await this.prisma.package.findUnique({
      where: { id },
      include: { items: { include: { rateCard: true } } },
    });
    if (!pkg) throw new NotFoundException('Package not found');
    return pkg;
  }

  create(dto: CreatePackageDto, createdBy: string) {
    return this.prisma.package.create({
      data: {
        name: dto.name,
        destination: dto.destination,
        theme: dto.theme,
        durationDays: dto.durationDays,
        basePrice: dto.basePrice ?? 0,
        currency: dto.currency ?? 'INR',
        coverImageUrl: dto.coverImageUrl,
        createdBy,
      },
    });
  }

  async update(id: string, dto: UpdatePackageDto) {
    await this.ensureExists(id);
    return this.prisma.package.update({ where: { id }, data: dto });
  }

  async addItem(packageId: string, dto: AddPackageItemDto) {
    await this.ensureExists(packageId);
    const rateCard = await this.prisma.rateCard.findUnique({ where: { id: dto.rateCardId } });
    if (!rateCard || !rateCard.active) throw new NotFoundException('Rate card not found or inactive');

    await this.prisma.packageItem.create({
      data: {
        packageId,
        rateCardId: dto.rateCardId,
        dayNumber: dto.dayNumber,
        description: dto.description,
        quantity: dto.quantity ?? 1,
      },
    });
    return this.findOne(packageId);
  }

  async removeItem(packageId: string, itemId: string) {
    await this.ensureExists(packageId);
    await this.prisma.packageItem.delete({ where: { id: itemId } });
    return this.findOne(packageId);
  }

  // Fast-path itinerary creation (feature-table "Itinerary Creation" row): a package is
  // a reusable template, so building a quotation from one just replays QuotationsService's
  // own create + addItem flow instead of duplicating its snapshot-costing logic.
  async buildQuotation(packageId: string, leadId: string, consultantId: string) {
    const pkg = await this.prisma.package.findUnique({ where: { id: packageId }, include: { items: true } });
    if (!pkg) throw new NotFoundException('Package not found');
    if (pkg.items.length === 0) throw new BadRequestException('This package has no items to copy into a quotation');

    const quotation = await this.quotationsService.create(leadId, consultantId);
    for (const item of pkg.items) {
      await this.quotationsService.addItem(quotation.id, {
        rateCardId: item.rateCardId,
        quantity: item.quantity,
      });
    }
    return this.quotationsService.findOne(quotation.id);
  }

  private async ensureExists(id: string) {
    const pkg = await this.prisma.package.findUnique({ where: { id } });
    if (!pkg) throw new NotFoundException('Package not found');
    return pkg;
  }
}
