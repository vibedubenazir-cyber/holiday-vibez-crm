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

  // relatedEntity can point at a lead, quotation, or conversation, so per-entity
  // ownership scoping would need to resolve the entity type first — out of scope
  // here. This at minimum closes the gap where any authenticated account of any
  // role (not just staff who'd plausibly need it) could read it.
  @UseGuards(RolesGuard)
  @Roles(Role.DIRECTOR, Role.ADMIN, Role.BRANCH_MANAGER, Role.TRAVEL_CONSULTANT)
  @Get(':entityId/log')
  log(@Param('entityId') entityId: string) {
    return this.notificationsService.log(entityId);
  }

  @Post('push-token')
  registerPushToken(@CurrentUser() user: { id: string }, @Body() dto: RegisterPushTokenDto) {
    return this.notificationsService.registerPushToken(user.id, dto.token);
  }
}
