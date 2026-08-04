import { Body, Controller, Get, Param, Patch, Post, Put, Query, UseGuards } from '@nestjs/common';
import { Role } from '@prisma/client';
import { CustomFieldsService } from './custom-fields.service';
import {
  CreateCustomFieldDefinitionDto,
  UpdateCustomFieldDefinitionDto,
  UpsertCustomFieldValuesDto,
} from './dto/custom-field.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';

const ALL_ROLES = [Role.DIRECTOR, Role.ADMIN, Role.BRANCH_MANAGER, Role.TRAVEL_CONSULTANT];

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('custom-fields')
export class CustomFieldsController {
  constructor(private readonly customFieldsService: CustomFieldsService) {}

  @Roles(...ALL_ROLES)
  @Get('definitions')
  findDefinitions(@Query('entityType') entityType?: string) {
    return this.customFieldsService.findDefinitions(entityType);
  }

  @Roles(Role.ADMIN, Role.DIRECTOR)
  @Post('definitions')
  createDefinition(@Body() dto: CreateCustomFieldDefinitionDto, @CurrentUser() user: { id: string }) {
    return this.customFieldsService.createDefinition(dto, user.id);
  }

  @Roles(Role.ADMIN, Role.DIRECTOR)
  @Patch('definitions/:id')
  updateDefinition(@Param('id') id: string, @Body() dto: UpdateCustomFieldDefinitionDto) {
    return this.customFieldsService.updateDefinition(id, dto);
  }

  // No extra role gate beyond authentication — whoever can edit the underlying
  // entity (e.g. a Consultant on their own lead) should be able to fill in its
  // custom fields, same as any other field on that entity.
  @Roles(...ALL_ROLES)
  @Get('values')
  findValues(@Query('entityType') entityType: string, @Query('entityId') entityId: string) {
    return this.customFieldsService.findValues(entityType, entityId);
  }

  @Roles(...ALL_ROLES)
  @Put('values')
  upsertValues(@Body() dto: UpsertCustomFieldValuesDto) {
    return this.customFieldsService.upsertValues(dto);
  }
}
