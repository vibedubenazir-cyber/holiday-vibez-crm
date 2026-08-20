import { BadRequestException, Body, Controller, Get, Param, Patch, Post, Query, UploadedFile, UseGuards, UseInterceptors } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { parse } from 'csv-parse/sync';
import { Role } from '@prisma/client';
import { LeadsService } from './leads.service';
import { CreateLeadDto, UpdateLeadDto } from './dto/lead.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { resolveBranchScope } from '../common/branch-scope.util';

const MAX_CSV_SIZE_BYTES = 2 * 1024 * 1024; // 2MB

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('leads')
export class LeadsController {
  constructor(private readonly leadsService: LeadsService) {}

  @Roles(Role.DIRECTOR, Role.ADMIN, Role.BRANCH_MANAGER, Role.TRAVEL_CONSULTANT)
  @Get()
  findAll(@CurrentUser() user: { id: string; role: Role; branchId: string | null }, @Query('branchId') branchId?: string) {
    // Consultants only ever see their own leads; Manager scoped to own branch (spec Section 2).
    if (user.role === Role.TRAVEL_CONSULTANT) {
      return this.leadsService.findAll({ consultantId: user.id });
    }
    if (user.role === Role.BRANCH_MANAGER) {
      return this.leadsService.findAll({ branchId: resolveBranchScope(user) });
    }
    return this.leadsService.findAll({ branchId });
  }

  @Roles(Role.DIRECTOR, Role.ADMIN, Role.BRANCH_MANAGER)
  @Get('unassigned')
  findUnassigned() {
    return this.leadsService.findUnassigned();
  }

  // Active consultants available for the leads list's inline Assign dropdown
  // — scoped the same way assign()/reassign() are, so a name shown here is
  // always a valid target.
  @Roles(Role.ADMIN, Role.BRANCH_MANAGER)
  @Get('consultants')
  listConsultants(@CurrentUser() user: { id: string; role: Role; branchId: string | null }) {
    return this.leadsService.listConsultants(user);
  }

  @Roles(Role.ADMIN, Role.BRANCH_MANAGER)
  @Post()
  create(@Body() dto: CreateLeadDto, @CurrentUser() user: { id: string; role: Role; branchId: string | null }) {
    return this.leadsService.create(dto, user);
  }

  // CSV columns: source,clientName,phone,email,destination,branch — same write
  // tier as single-lead create(); each row auto-assigns round-robin same as a
  // one-off create, just looped with per-row error reporting.
  @Roles(Role.ADMIN, Role.BRANCH_MANAGER)
  @Post('bulk-import')
  @UseInterceptors(FileInterceptor('file', { storage: memoryStorage(), limits: { fileSize: MAX_CSV_SIZE_BYTES } }))
  async bulkImport(@UploadedFile() file: Express.Multer.File, @CurrentUser() user: { id: string; role: Role; branchId: string | null }) {
    if (!file) throw new BadRequestException('No CSV file uploaded');
    let rows: Record<string, string>[];
    try {
      rows = parse(file.buffer, { columns: true, skip_empty_lines: true, trim: true });
    } catch (err) {
      throw new BadRequestException(`Could not parse CSV: ${err instanceof Error ? err.message : 'invalid format'}`);
    }
    if (rows.length === 0) throw new BadRequestException('CSV has no data rows');
    return this.leadsService.bulkImport(rows, user);
  }

  @Roles(Role.DIRECTOR, Role.ADMIN, Role.BRANCH_MANAGER, Role.TRAVEL_CONSULTANT)
  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateLeadDto, @CurrentUser() user: { id: string; role: Role; branchId: string | null }) {
    return this.leadsService.update(id, dto, user);
  }

  @Roles(Role.ADMIN, Role.BRANCH_MANAGER)
  @Post(':id/assign')
  assign(@Param('id') id: string, @CurrentUser() user: { id: string; role: Role; branchId: string | null }, @Body('consultantId') consultantId?: string) {
    return consultantId ? this.leadsService.reassign(id, consultantId, user) : this.leadsService.autoAssign(id);
  }

  @Roles(Role.DIRECTOR, Role.ADMIN, Role.BRANCH_MANAGER, Role.TRAVEL_CONSULTANT)
  @Get(':id/notes')
  listNotes(@Param('id') id: string, @CurrentUser() user: { id: string; role: Role; branchId: string | null }) {
    return this.leadsService.listNotes(id, user);
  }

  @Roles(Role.DIRECTOR, Role.ADMIN, Role.BRANCH_MANAGER, Role.TRAVEL_CONSULTANT)
  @Post(':id/notes')
  addNote(@Param('id') id: string, @Body('body') body: string, @CurrentUser() user: { id: string; role: Role; branchId: string | null }) {
    if (!body?.trim()) throw new BadRequestException('Note body is required');
    return this.leadsService.addNote(id, body.trim(), user);
  }

  @Roles(Role.DIRECTOR, Role.ADMIN, Role.BRANCH_MANAGER, Role.TRAVEL_CONSULTANT)
  @Get(':id/reminders')
  listReminders(@Param('id') id: string, @CurrentUser() user: { id: string; role: Role; branchId: string | null }) {
    return this.leadsService.listReminders(id, user);
  }

  @Roles(Role.DIRECTOR, Role.ADMIN, Role.BRANCH_MANAGER, Role.TRAVEL_CONSULTANT)
  @Post(':id/reminders')
  addReminder(
    @Param('id') id: string,
    @Body() dto: { dueAt: string; note: string; assignedToId?: string },
    @CurrentUser() user: { id: string; role: Role; branchId: string | null },
  ) {
    if (!dto?.dueAt || !dto?.note?.trim()) throw new BadRequestException('dueAt and note are required');
    return this.leadsService.addReminder(id, dto, user);
  }

  @Roles(Role.DIRECTOR, Role.ADMIN, Role.BRANCH_MANAGER, Role.TRAVEL_CONSULTANT)
  @Patch(':id/reminders/:reminderId/complete')
  completeReminder(
    @Param('id') id: string,
    @Param('reminderId') reminderId: string,
    @CurrentUser() user: { id: string; role: Role; branchId: string | null },
  ) {
    return this.leadsService.completeReminder(id, reminderId, user);
  }
}
