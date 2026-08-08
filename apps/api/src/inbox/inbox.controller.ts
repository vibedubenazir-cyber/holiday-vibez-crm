import { Body, Controller, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { NotificationChannel, Role } from '@prisma/client';
import { InboxService } from './inbox.service';
import { EnsureConversationDto, SendMessageDto, SimulateInboundDto, UpdateConversationDto } from './dto/inbox.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { resolveBranchScope } from '../common/branch-scope.util';

type AuthUser = { id: string; role: Role; branchId: string | null };
const ALL_ROLES = [Role.DIRECTOR, Role.ADMIN, Role.BRANCH_MANAGER, Role.TRAVEL_CONSULTANT];

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller()
export class InboxController {
  constructor(private readonly inboxService: InboxService) {}

  @Roles(...ALL_ROLES)
  @Get('conversations')
  findAll(@CurrentUser() user: AuthUser, @Query('channel') channel?: NotificationChannel) {
    if (user.role === Role.TRAVEL_CONSULTANT) return this.inboxService.findAll({ consultantId: user.id, channel });
    if (user.role === Role.BRANCH_MANAGER) return this.inboxService.findAll({ branchId: resolveBranchScope(user), channel });
    return this.inboxService.findAll({ channel });
  }

  @Roles(...ALL_ROLES)
  @Post('conversations/lead/:leadId/ensure')
  ensure(@Param('leadId') leadId: string, @Body() dto: EnsureConversationDto) {
    return this.inboxService.ensureForLead(leadId, dto.channel);
  }

  @Roles(...ALL_ROLES)
  @Get('conversations/:id/messages')
  messages(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    return this.inboxService.messages(id, user);
  }

  @Roles(...ALL_ROLES)
  @Post('conversations/:id/messages')
  send(@Param('id') id: string, @Body() dto: SendMessageDto, @CurrentUser() user: AuthUser) {
    return this.inboxService.sendMessage(id, dto.body, user);
  }

  // Dev-only stand-in for a real WhatsApp/email inbound webhook (spec's own gap: no
  // live channel wired up in this environment). Feeds the same bot-reply logic.
  @Roles(...ALL_ROLES)
  @Post('conversations/:id/simulate-inbound')
  simulateInbound(@Param('id') id: string, @Body() dto: SimulateInboundDto, @CurrentUser() user: AuthUser) {
    return this.inboxService.simulateInbound(id, dto.body, user);
  }

  @Roles(...ALL_ROLES)
  @Patch('conversations/:id')
  update(@Param('id') id: string, @Body() dto: UpdateConversationDto, @CurrentUser() user: AuthUser) {
    return this.inboxService.updateConversation(id, dto.botEnabled, user);
  }
}
