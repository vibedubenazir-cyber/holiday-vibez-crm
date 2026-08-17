import { Body, Controller, Delete, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { Role } from '@prisma/client';
import { EmployeeDocumentsService } from './employee-documents.service';
import { CreateEmployeeDocumentDto } from './dto/employee-document.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { resolveBranchScope } from '../common/branch-scope.util';

type AuthUser = { id: string; role: Role; branchId: string | null };
const ALL_ROLES = [Role.DIRECTOR, Role.ADMIN, Role.BRANCH_MANAGER, Role.TRAVEL_CONSULTANT];
const HR_ROLES = [Role.DIRECTOR, Role.ADMIN, Role.BRANCH_MANAGER];

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('employee-documents')
export class EmployeeDocumentsController {
  constructor(private readonly documentsService: EmployeeDocumentsService) {}

  @Roles(...ALL_ROLES)
  @Get('me')
  findMine(@CurrentUser() user: AuthUser) {
    return this.documentsService.findForUser(user.id, user);
  }

  @Roles(...HR_ROLES)
  @Get('expiring')
  expiring(@CurrentUser() user: AuthUser, @Query('days') days?: string, @Query('branchId') branchId?: string) {
    return this.documentsService.expiring(days ? Number(days) : 60, resolveBranchScope(user, branchId));
  }

  @Roles(...ALL_ROLES)
  @Get('user/:userId')
  findForUser(@Param('userId') userId: string, @CurrentUser() user: AuthUser) {
    return this.documentsService.findForUser(userId, user);
  }

  @Roles(...ALL_ROLES)
  @Post()
  create(@Body() dto: CreateEmployeeDocumentDto, @CurrentUser() user: AuthUser) {
    return this.documentsService.create(dto, user);
  }

  @Roles(...ALL_ROLES)
  @Delete(':id')
  remove(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    return this.documentsService.remove(id, user);
  }
}
