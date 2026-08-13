import { Body, Controller, Get, Param, Patch, Query, UseGuards } from '@nestjs/common';
import { Role } from '@prisma/client';
import { EmployeesService } from './employees.service';
import { UpdateEmployeeProfileDto } from './dto/employee.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';

const ALL_ROLES = [Role.DIRECTOR, Role.ADMIN, Role.BRANCH_MANAGER, Role.TRAVEL_CONSULTANT];
const MANAGER_ROLES = [Role.DIRECTOR, Role.ADMIN];

// Employee Directory is company-wide by design — unlike operational data
// (leads, expenses), a staff roster is normally browsable across branches
// so people can find colleagues elsewhere in the company. branchId is an
// optional filter, not an enforced scope.
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('employees')
export class EmployeesController {
  constructor(private readonly employeesService: EmployeesService) {}

  @Roles(...ALL_ROLES)
  @Get()
  directory(@Query('branchId') branchId?: string) {
    return this.employeesService.directory({ branchId });
  }

  @Roles(...ALL_ROLES)
  @Get('org-chart')
  orgChart() {
    return this.employeesService.orgChart();
  }

  @Roles(...MANAGER_ROLES)
  @Patch(':id')
  updateProfile(@Param('id') id: string, @Body() dto: UpdateEmployeeProfileDto) {
    return this.employeesService.updateProfile(id, dto);
  }
}
