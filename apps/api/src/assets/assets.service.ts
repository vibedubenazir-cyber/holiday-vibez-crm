import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { AssetStatus, Prisma } from '@prisma/client';
import { PrismaService } from '../prisma.service';
import { AssignAssetDto, CreateAssetDto, UpdateAssetDto } from './dto/asset.dto';

@Injectable()
export class AssetsService {
  constructor(private readonly prisma: PrismaService) {}

  findAll(filter: { branchId?: string; status?: AssetStatus; assignedToId?: string }) {
    return this.prisma.asset.findMany({
      where: {
        branchId: filter.branchId,
        status: filter.status,
        assignedToId: filter.assignedToId,
      },
      include: { assignedTo: { select: { id: true, name: true, employeeCode: true } } },
      orderBy: [{ status: 'asc' }, { assetTag: 'asc' }],
    });
  }

  findForUser(userId: string) {
    return this.prisma.asset.findMany({
      where: { assignedToId: userId, status: AssetStatus.ASSIGNED },
      orderBy: { assetTag: 'asc' },
    });
  }

  async create(dto: CreateAssetDto) {
    try {
      return await this.prisma.asset.create({
        data: {
          assetTag: dto.assetTag,
          type: dto.type,
          name: dto.name,
          serialNumber: dto.serialNumber,
          purchaseDate: dto.purchaseDate ? new Date(dto.purchaseDate) : undefined,
          branchId: dto.branchId,
          notes: dto.notes,
        },
      });
    } catch (err) {
      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
        throw new BadRequestException(`Asset tag "${dto.assetTag}" is already in use`);
      }
      throw err;
    }
  }

  async update(id: string, dto: UpdateAssetDto) {
    await this.require(id);
    return this.prisma.asset.update({
      where: { id },
      data: { ...dto, purchaseDate: dto.purchaseDate ? new Date(dto.purchaseDate) : undefined },
    });
  }

  async assign(id: string, dto: AssignAssetDto) {
    const asset = await this.require(id);
    if (asset.status === AssetStatus.ASSIGNED) {
      throw new BadRequestException('That asset is already assigned — return it first');
    }
    if (asset.status === AssetStatus.RETIRED) {
      throw new BadRequestException('Retired assets cannot be assigned');
    }
    const user = await this.prisma.user.findUnique({ where: { id: dto.userId } });
    if (!user) throw new NotFoundException('Employee not found');

    return this.prisma.asset.update({
      where: { id },
      data: {
        assignedToId: dto.userId,
        status: AssetStatus.ASSIGNED,
        assignedAt: new Date(),
        returnedAt: null,
      },
      include: { assignedTo: { select: { id: true, name: true } } },
    });
  }

  async returnAsset(id: string) {
    const asset = await this.require(id);
    if (asset.status !== AssetStatus.ASSIGNED) {
      throw new BadRequestException('That asset is not currently assigned');
    }
    return this.prisma.asset.update({
      where: { id },
      data: { status: AssetStatus.RETURNED, assignedToId: null, returnedAt: new Date() },
    });
  }

  async retire(id: string) {
    const asset = await this.require(id);
    if (asset.status === AssetStatus.ASSIGNED) {
      throw new BadRequestException('Return the asset from its holder before retiring it');
    }
    return this.prisma.asset.update({ where: { id }, data: { status: AssetStatus.RETIRED } });
  }

  // Used by exit clearance: an employee still holding company property should
  // not be cleared. Returns the blocking assets so the message can name them.
  outstandingFor(userId: string) {
    return this.prisma.asset.findMany({
      where: { assignedToId: userId, status: AssetStatus.ASSIGNED },
      select: { id: true, assetTag: true, name: true },
    });
  }

  private async require(id: string) {
    const asset = await this.prisma.asset.findUnique({ where: { id } });
    if (!asset) throw new NotFoundException('Asset not found');
    return asset;
  }
}
