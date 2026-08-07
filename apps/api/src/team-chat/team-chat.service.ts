import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { Role } from '@prisma/client';
import { PrismaService } from '../prisma.service';
import { CreateGroupChannelDto } from './dto/create-group-channel.dto';
import { PostMessageDto } from './dto/post-message.dto';
import { AddMembersDto } from './dto/add-members.dto';

type Actor = { id: string; role: Role; branchId?: string | null };
const MANAGE_ROLES: Role[] = [Role.DIRECTOR, Role.ADMIN];

const USER_SELECT = { id: true, name: true, role: true } as const;

@Injectable()
export class TeamChatService {
  constructor(private readonly prisma: PrismaService) {}

  private async ensureOrgWideChannel() {
    const existing = await this.prisma.teamChannel.findFirst({ where: { type: 'ORG_WIDE' } });
    if (existing) return existing;
    return this.prisma.teamChannel.create({
      data: { name: 'All Staff', type: 'ORG_WIDE', createdBy: 'system' },
    });
  }

  private async ensureBranchChannel(branchId: string) {
    const existing = await this.prisma.teamChannel.findFirst({ where: { type: 'BRANCH', branchId } });
    if (existing) return existing;
    const branch = await this.prisma.branch.findUnique({ where: { id: branchId } });
    if (!branch) throw new NotFoundException('Branch not found');
    return this.prisma.teamChannel.create({
      data: { name: `${branch.name} Team`, type: 'BRANCH', branchId, createdBy: 'system' },
    });
  }

  async listChannelsForUser(actor: Actor) {
    const orgWide = await this.ensureOrgWideChannel();

    let branchChannels: Awaited<ReturnType<typeof this.ensureBranchChannel>>[];
    if (MANAGE_ROLES.includes(actor.role)) {
      const branches = await this.prisma.branch.findMany();
      branchChannels = await Promise.all(branches.map((b) => this.ensureBranchChannel(b.id)));
    } else if (actor.branchId) {
      branchChannels = [await this.ensureBranchChannel(actor.branchId)];
    } else {
      branchChannels = [];
    }

    const groupMemberships = await this.prisma.teamChannelMember.findMany({
      where: { userId: actor.id, channel: { type: 'GROUP' } },
      include: { channel: true },
    });
    const groupChannels = groupMemberships.map((m) => m.channel);

    const all = [orgWide, ...branchChannels, ...groupChannels];
    all.sort((a, b) => new Date(b.lastMessageAt).getTime() - new Date(a.lastMessageAt).getTime());
    return all;
  }

  async createGroupChannel(dto: CreateGroupChannelDto, actor: Actor) {
    const memberIds = Array.from(new Set([actor.id, ...dto.memberIds]));
    const channel = await this.prisma.teamChannel.create({
      data: {
        name: dto.name,
        type: 'GROUP',
        createdBy: actor.id,
        members: { create: memberIds.map((userId) => ({ userId })) },
      },
    });
    return channel;
  }

  async addMembers(channelId: string, dto: AddMembersDto, actor: Actor) {
    const channel = await this.getChannelOrThrow(channelId);
    if (channel.type !== 'GROUP') throw new ForbiddenException('Only group channels support adding members');
    await this.checkAccess(channel, actor);

    const existing = await this.prisma.teamChannelMember.findMany({
      where: { channelId },
      select: { userId: true },
    });
    const existingIds = new Set(existing.map((m) => m.userId));
    const toAdd = dto.memberIds.filter((id) => !existingIds.has(id));
    if (toAdd.length > 0) {
      await this.prisma.teamChannelMember.createMany({
        data: toAdd.map((userId) => ({ channelId, userId })),
      });
    }
    return this.prisma.teamChannelMember.findMany({ where: { channelId }, include: { user: { select: USER_SELECT } } });
  }

  async findMessages(channelId: string, actor: Actor) {
    const channel = await this.getChannelOrThrow(channelId);
    await this.checkAccess(channel, actor);
    return this.prisma.teamMessage.findMany({
      where: { channelId },
      include: { sender: { select: USER_SELECT } },
      orderBy: { createdAt: 'asc' },
    });
  }

  async postMessage(channelId: string, dto: PostMessageDto, actor: Actor) {
    const channel = await this.getChannelOrThrow(channelId);
    await this.checkAccess(channel, actor);
    const message = await this.prisma.teamMessage.create({
      data: {
        channelId,
        senderId: actor.id,
        body: dto.body,
        fileUrl: dto.fileUrl,
        fileName: dto.fileName,
        fileSize: dto.fileSize,
      },
      include: { sender: { select: USER_SELECT } },
    });
    await this.prisma.teamChannel.update({ where: { id: channelId }, data: { lastMessageAt: new Date() } });
    return message;
  }

  private async getChannelOrThrow(channelId: string) {
    const channel = await this.prisma.teamChannel.findUnique({ where: { id: channelId } });
    if (!channel) throw new NotFoundException('Channel not found');
    return channel;
  }

  private async checkAccess(channel: { type: string; branchId: string | null; id: string }, actor: Actor) {
    if (channel.type === 'ORG_WIDE') return;
    if (channel.type === 'BRANCH') {
      if (MANAGE_ROLES.includes(actor.role) || actor.branchId === channel.branchId) return;
      throw new ForbiddenException('You do not have access to this channel');
    }
    // GROUP
    const membership = await this.prisma.teamChannelMember.findUnique({
      where: { channelId_userId: { channelId: channel.id, userId: actor.id } },
    });
    if (!membership) throw new ForbiddenException('You are not a member of this channel');
  }
}
