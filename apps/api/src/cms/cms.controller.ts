import { Body, Controller, Get, Param, Patch, Post, Put, Query, UseGuards } from '@nestjs/common';
import { CmsContentType, Role } from '@prisma/client';
import { CmsService } from './cms.service';
import { CreateCmsContentDto, UpdateCmsContentDto, UpsertSiteSettingDto } from './dto/cms.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';

const ALL_ROLES = [Role.DIRECTOR, Role.ADMIN, Role.BRANCH_MANAGER, Role.TRAVEL_CONSULTANT];

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('cms')
export class CmsController {
  constructor(private readonly cmsService: CmsService) {}

  @Roles(...ALL_ROLES)
  @Get('content')
  findAllContent(@Query('type') type?: CmsContentType) {
    return this.cmsService.findAllContent(type);
  }

  @Roles(Role.ADMIN, Role.DIRECTOR)
  @Post('content')
  createContent(@Body() dto: CreateCmsContentDto, @CurrentUser() user: { id: string }) {
    return this.cmsService.createContent(dto, user.id);
  }

  @Roles(Role.ADMIN, Role.DIRECTOR)
  @Patch('content/:id')
  updateContent(@Param('id') id: string, @Body() dto: UpdateCmsContentDto) {
    return this.cmsService.updateContent(id, dto);
  }

  @Roles(Role.ADMIN, Role.DIRECTOR)
  @Get('settings')
  findAllSettings() {
    return this.cmsService.findAllSettings();
  }

  @Roles(Role.ADMIN, Role.DIRECTOR)
  @Put('settings')
  upsertSetting(@Body() dto: UpsertSiteSettingDto) {
    return this.cmsService.upsertSetting(dto);
  }
}
