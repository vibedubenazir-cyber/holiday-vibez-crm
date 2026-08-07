import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Param,
  Post,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { extname } from 'path';
import { randomUUID } from 'crypto';
import { writeFile } from 'fs/promises';
import { join } from 'path';
import { Role } from '@prisma/client';
import { TeamChatService } from './team-chat.service';
import { PresenceService } from './presence.service';
import { CreateGroupChannelDto } from './dto/create-group-channel.dto';
import { PostMessageDto } from './dto/post-message.dto';
import { AddMembersDto } from './dto/add-members.dto';
import { SetPresenceStatusDto } from './dto/set-presence-status.dto';
import { OpenDirectChannelDto } from './dto/open-direct-channel.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { isS3Configured, uploadToS3 } from '../storage/s3.util';

type AuthUser = { id: string; role: Role; branchId?: string | null };
const ALL_ROLES = [Role.DIRECTOR, Role.ADMIN, Role.BRANCH_MANAGER, Role.TRAVEL_CONSULTANT];

const ALLOWED_EXTENSIONS = [
  '.png', '.jpg', '.jpeg', '.gif', '.webp',
  '.pdf', '.doc', '.docx', '.xls', '.xlsx', '.ppt', '.pptx', '.csv', '.txt', '.zip',
];
const MAX_FILE_SIZE_BYTES = 15 * 1024 * 1024; // 15MB

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('team-chat')
export class TeamChatController {
  constructor(
    private readonly teamChatService: TeamChatService,
    private readonly presenceService: PresenceService,
  ) {}

  @Roles(...ALL_ROLES)
  @Get('presence')
  listPresence() {
    return this.presenceService.listAll();
  }

  @Roles(...ALL_ROLES)
  @Post('presence/heartbeat')
  heartbeat(@CurrentUser() user: AuthUser) {
    return this.presenceService.heartbeat(user.id);
  }

  @Roles(...ALL_ROLES)
  @Post('presence/status')
  setStatus(@Body() dto: SetPresenceStatusDto, @CurrentUser() user: AuthUser) {
    return this.presenceService.setStatus(user.id, dto.status);
  }

  @Roles(...ALL_ROLES)
  @Get('channels')
  listChannels(@CurrentUser() user: AuthUser) {
    return this.teamChatService.listChannelsForUser(user);
  }

  @Roles(...ALL_ROLES)
  @Post('channels/group')
  createGroupChannel(@Body() dto: CreateGroupChannelDto, @CurrentUser() user: AuthUser) {
    return this.teamChatService.createGroupChannel(dto, user);
  }

  @Roles(...ALL_ROLES)
  @Post('channels/direct')
  openDirectChannel(@Body() dto: OpenDirectChannelDto, @CurrentUser() user: AuthUser) {
    return this.teamChatService.getOrCreateDirectChannel(dto.userId, user);
  }

  @Roles(...ALL_ROLES)
  @Post('channels/:id/members')
  addMembers(@Param('id') id: string, @Body() dto: AddMembersDto, @CurrentUser() user: AuthUser) {
    return this.teamChatService.addMembers(id, dto, user);
  }

  @Roles(...ALL_ROLES)
  @Get('channels/:id/messages')
  findMessages(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    return this.teamChatService.findMessages(id, user);
  }

  @Roles(...ALL_ROLES)
  @Post('channels/:id/messages')
  postMessage(@Param('id') id: string, @Body() dto: PostMessageDto, @CurrentUser() user: AuthUser) {
    return this.teamChatService.postMessage(id, dto, user);
  }

  @Roles(...ALL_ROLES)
  @Post('upload')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: memoryStorage(),
      limits: { fileSize: MAX_FILE_SIZE_BYTES },
      fileFilter: (_req, file, cb) => {
        const ext = extname(file.originalname).toLowerCase();
        if (!ALLOWED_EXTENSIONS.includes(ext)) {
          cb(new BadRequestException(`Unsupported file type: ${ext}`), false);
          return;
        }
        cb(null, true);
      },
    }),
  )
  async upload(@UploadedFile() file: Express.Multer.File) {
    if (!file) throw new BadRequestException('No file uploaded');
    const ext = extname(file.originalname).toLowerCase();
    const key = `${randomUUID()}${ext}`;
    const url = isS3Configured()
      ? await uploadToS3(file.buffer, key, file.mimetype)
      : await this.writeToLocalDisk(file.buffer, key);
    return { url, originalName: file.originalname, sizeBytes: file.size };
  }

  private async writeToLocalDisk(buffer: Buffer, key: string): Promise<string> {
    await writeFile(join(process.cwd(), 'uploads', key), buffer);
    return `/uploads/${key}`;
  }
}
