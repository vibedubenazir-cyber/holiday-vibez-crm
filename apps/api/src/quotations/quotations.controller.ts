import { Body, Controller, Delete, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { Role } from '@prisma/client';
import { QuotationsService } from './quotations.service';
import { AddQuotationItemDto, CreateQuotationDto, RejectQuotationDto } from './dto/quotation.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';

type AuthUser = { id: string; role: Role; branchId: string | null };

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('quotations')
export class QuotationsController {
  constructor(private readonly quotationsService: QuotationsService) {}

  @Roles(Role.DIRECTOR, Role.ADMIN, Role.BRANCH_MANAGER, Role.TRAVEL_CONSULTANT)
  @Get()
  findAll(@CurrentUser() user: AuthUser, @Query('branchId') branchId?: string) {
    if (user.role === Role.TRAVEL_CONSULTANT) return this.quotationsService.findAll({ consultantId: user.id });
    if (user.role === Role.BRANCH_MANAGER) return this.quotationsService.findAll({ branchId: user.branchId ?? undefined });
    return this.quotationsService.findAll({ branchId });
  }

  @Roles(Role.DIRECTOR, Role.ADMIN, Role.BRANCH_MANAGER, Role.TRAVEL_CONSULTANT)
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.quotationsService.findOne(id);
  }

  @Roles(Role.TRAVEL_CONSULTANT, Role.ADMIN)
  @Post()
  create(@Body() dto: CreateQuotationDto, @CurrentUser() user: AuthUser) {
    return this.quotationsService.create(dto.leadId, user.id);
  }

  @Roles(Role.TRAVEL_CONSULTANT, Role.ADMIN)
  @Post(':id/items')
  addItem(@Param('id') id: string, @Body() dto: AddQuotationItemDto) {
    return this.quotationsService.addItem(id, dto);
  }

  @Roles(Role.TRAVEL_CONSULTANT, Role.ADMIN)
  @Delete(':id/items/:itemId')
  removeItem(@Param('id') id: string, @Param('itemId') itemId: string) {
    return this.quotationsService.removeItem(id, itemId);
  }

  @Roles(Role.TRAVEL_CONSULTANT, Role.ADMIN)
  @Post(':id/submit-for-approval')
  submit(@Param('id') id: string) {
    return this.quotationsService.submitForApproval(id);
  }

  // Approve/reject restricted to Branch Manager of that lead's branch (spec Section 13).
  @Roles(Role.BRANCH_MANAGER, Role.ADMIN)
  @Post(':id/approve')
  approve(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    return this.quotationsService.approve(id, user.id, user.role, user.branchId);
  }

  @Roles(Role.BRANCH_MANAGER, Role.ADMIN)
  @Post(':id/reject')
  reject(@Param('id') id: string, @Body() dto: RejectQuotationDto, @CurrentUser() user: AuthUser) {
    return this.quotationsService.reject(id, user.role, user.branchId, dto.comments);
  }

  @Roles(Role.DIRECTOR, Role.ADMIN, Role.BRANCH_MANAGER, Role.TRAVEL_CONSULTANT)
  @Get(':id/pdf')
  pdf(@Param('id') id: string) {
    return this.quotationsService.pdfUrl(id);
  }

  @Roles(Role.DIRECTOR, Role.ADMIN, Role.BRANCH_MANAGER, Role.TRAVEL_CONSULTANT)
  @Post(':id/send')
  send(@Param('id') id: string) {
    return this.quotationsService.sendToClient(id);
  }
}
