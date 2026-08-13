import { Body, Controller, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ReimbursementStatus, Role } from '@prisma/client';
import { ReimbursementsService } from './reimbursements.service';
import { CreateReimbursementClaimDto, ReviewReimbursementClaimDto } from './dto/reimbursement-claim.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { resolveBranchScope } from '../common/branch-scope.util';

type AuthUser = { id: string; role: Role; branchId: string | null };
const ALL_ROLES = [Role.DIRECTOR, Role.ADMIN, Role.BRANCH_MANAGER, Role.TRAVEL_CONSULTANT];
const MANAGER_ROLES = [Role.DIRECTOR, Role.ADMIN, Role.BRANCH_MANAGER];
// Approval sign-off stays Admin/Director-only, same tier as Expense
// approval — Branch Manager can see their team's claims but not action them.
const APPROVER_ROLES = [Role.DIRECTOR, Role.ADMIN];

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('reimbursements')
export class ReimbursementsController {
  constructor(private readonly reimbursementsService: ReimbursementsService) {}

  @Roles(...ALL_ROLES)
  @Post()
  create(@CurrentUser() user: AuthUser, @Body() dto: CreateReimbursementClaimDto) {
    return this.reimbursementsService.create(user.id, dto);
  }

  @Roles(...ALL_ROLES)
  @Get('me')
  findMine(@CurrentUser() user: AuthUser) {
    return this.reimbursementsService.findMine(user.id);
  }

  @Roles(...MANAGER_ROLES)
  @Get()
  findAll(@CurrentUser() user: AuthUser, @Query('branchId') branchId?: string, @Query('status') status?: ReimbursementStatus) {
    return this.reimbursementsService.findAll({ branchId: resolveBranchScope(user, branchId), status });
  }

  @Roles(...APPROVER_ROLES)
  @Patch(':id/approve')
  approve(@Param('id') id: string, @CurrentUser() user: AuthUser, @Body() dto: ReviewReimbursementClaimDto) {
    return this.reimbursementsService.review(id, 'APPROVED', user.id, dto.comment);
  }

  @Roles(...APPROVER_ROLES)
  @Patch(':id/reject')
  reject(@Param('id') id: string, @CurrentUser() user: AuthUser, @Body() dto: ReviewReimbursementClaimDto) {
    return this.reimbursementsService.review(id, 'REJECTED', user.id, dto.comment);
  }

  @Roles(...APPROVER_ROLES)
  @Patch(':id/mark-paid')
  markPaid(@Param('id') id: string) {
    return this.reimbursementsService.markPaid(id);
  }
}
