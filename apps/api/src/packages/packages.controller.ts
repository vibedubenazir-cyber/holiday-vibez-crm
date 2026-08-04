import { Body, Controller, Delete, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { Role } from '@prisma/client';
import { PackagesService } from './packages.service';
import {
  AddPackageItemDto,
  BuildQuotationFromPackageDto,
  CreatePackageDto,
  UpdatePackageDto,
} from './dto/package.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';

type AuthUser = { id: string; role: Role; branchId: string | null };

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('packages')
export class PackagesController {
  constructor(private readonly packagesService: PackagesService) {}

  @Roles(Role.DIRECTOR, Role.ADMIN, Role.BRANCH_MANAGER, Role.TRAVEL_CONSULTANT)
  @Get()
  findAll() {
    return this.packagesService.findAll();
  }

  @Roles(Role.DIRECTOR, Role.ADMIN, Role.BRANCH_MANAGER, Role.TRAVEL_CONSULTANT)
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.packagesService.findOne(id);
  }

  @Roles(Role.ADMIN, Role.BRANCH_MANAGER)
  @Post()
  create(@Body() dto: CreatePackageDto, @CurrentUser() user: AuthUser) {
    return this.packagesService.create(dto, user.id);
  }

  @Roles(Role.ADMIN, Role.BRANCH_MANAGER)
  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdatePackageDto) {
    return this.packagesService.update(id, dto);
  }

  @Roles(Role.ADMIN, Role.BRANCH_MANAGER)
  @Post(':id/items')
  addItem(@Param('id') id: string, @Body() dto: AddPackageItemDto) {
    return this.packagesService.addItem(id, dto);
  }

  @Roles(Role.ADMIN, Role.BRANCH_MANAGER)
  @Delete(':id/items/:itemId')
  removeItem(@Param('id') id: string, @Param('itemId') itemId: string) {
    return this.packagesService.removeItem(id, itemId);
  }

  // Mirrors quotations.controller's own create-endpoint role gate exactly.
  @Roles(Role.TRAVEL_CONSULTANT, Role.ADMIN)
  @Post(':id/build-quotation')
  buildQuotation(@Param('id') id: string, @Body() dto: BuildQuotationFromPackageDto, @CurrentUser() user: AuthUser) {
    return this.packagesService.buildQuotation(id, dto.leadId, user.id);
  }
}
