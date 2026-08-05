import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { Role } from '@prisma/client';
import { NotificationsService } from './notifications.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { RegisterPushTokenDto } from './dto/push-token.dto';

@UseGuards(JwtAuthGuard)
@Controller('notifications')
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  // NotificationsService.log() resolves entityId against every entity type
  // relatedEntity can point at (lead/quotation/booking/conversation/traveler/
  // campaign) and scopes access the same way leads/travelers do.
  @UseGuards(RolesGuard)
  @Roles(Role.DIRECTOR, Role.ADMIN, Role.BRANCH_MANAGER, Role.TRAVEL_CONSULTANT)
  @Get(':entityId/log')
  log(@Param('entityId') entityId: string, @CurrentUser() user: { id: string; role: Role; branchId: string | null }) {
    return this.notificationsService.log(entityId, user);
  }

  @Post('push-token')
  registerPushToken(@CurrentUser() user: { id: string }, @Body() dto: RegisterPushTokenDto) {
    return this.notificationsService.registerPushToken(user.id, dto.token);
  }
}
