import { Body, Controller, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { Role } from '@prisma/client';
import { SupportTicketsService } from './support-tickets.service';
import { CreateTicketDto } from './dto/create-ticket.dto';
import { UpdateTicketDto } from './dto/update-ticket.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';

type AuthUser = { id: string; role: Role };
const ALL_ROLES = [Role.DIRECTOR, Role.ADMIN, Role.BRANCH_MANAGER, Role.TRAVEL_CONSULTANT];

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('support-tickets')
export class SupportTicketsController {
  constructor(private readonly ticketsService: SupportTicketsService) {}

  @Roles(...ALL_ROLES)
  @Get()
  findAll(@Query('status') status?: string) {
    return this.ticketsService.findAll(status);
  }

  @Roles(...ALL_ROLES)
  @Get('mine')
  findMine(@CurrentUser() user: AuthUser) {
    return this.ticketsService.findMine(user.id);
  }

  @Roles(...ALL_ROLES)
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.ticketsService.findOne(id);
  }

  @Roles(...ALL_ROLES)
  @Post('lead/:leadId')
  create(@Param('leadId') leadId: string, @Body() dto: CreateTicketDto, @CurrentUser() user: AuthUser) {
    return this.ticketsService.create(leadId, dto, user.id);
  }

  @Roles(...ALL_ROLES)
  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateTicketDto, @CurrentUser() user: AuthUser) {
    return this.ticketsService.update(id, dto, user);
  }
}
