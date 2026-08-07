import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma.service';

// A client is considered ONLINE if it heartbeat within this window; the frontend
// pings every 25s, so 45s tolerates one missed beat (a slow tab, brief network blip)
// without flickering to OFFLINE.
const ONLINE_WINDOW_MS = 45_000;

export type ComputedPresence = 'ONLINE' | 'BUSY' | 'OFFLINE';

@Injectable()
export class PresenceService {
  constructor(private readonly prisma: PrismaService) {}

  async heartbeat(userId: string) {
    await this.prisma.user.update({ where: { id: userId }, data: { lastSeenAt: new Date() } });
    return { ok: true };
  }

  async setStatus(userId: string, status: 'AVAILABLE' | 'BUSY') {
    await this.prisma.user.update({
      where: { id: userId },
      data: { manualStatus: status === 'BUSY' ? 'BUSY' : null, lastSeenAt: new Date() },
    });
    return { ok: true };
  }

  async listAll() {
    const users = await this.prisma.user.findMany({
      where: { status: 'ACTIVE' },
      select: { id: true, name: true, role: true, branchId: true, lastSeenAt: true, manualStatus: true },
      orderBy: { name: 'asc' },
    });
    return users.map((u) => ({
      userId: u.id,
      name: u.name,
      role: u.role,
      branchId: u.branchId,
      status: this.computeStatus(u.lastSeenAt, u.manualStatus),
    }));
  }

  private computeStatus(lastSeenAt: Date | null, manualStatus: string | null): ComputedPresence {
    const isRecent = lastSeenAt ? Date.now() - lastSeenAt.getTime() < ONLINE_WINDOW_MS : false;
    if (!isRecent) return 'OFFLINE';
    if (manualStatus === 'BUSY') return 'BUSY';
    return 'ONLINE';
  }
}
