import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Req,
  Res,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import type { Response } from 'express';
import { Role, TravelerDocumentType } from '@prisma/client';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { TravelerAuthGuard } from '../traveler-auth/traveler-auth.guard';
import { MAX_DOCUMENT_BYTES, TravelerDocumentsService } from './traveler-documents.service';

type TravelerRequest = { travelerSession: { travelerId: string; bookingId: string } };
type StaffRequest = { user: { id: string; role: Role; branchId: string | null } };

const OPS_ROLES = [Role.DIRECTOR, Role.ADMIN, Role.BRANCH_MANAGER, Role.TRAVEL_CONSULTANT];

const UPLOAD = FileInterceptor('file', {
  storage: memoryStorage(),
  limits: { fileSize: MAX_DOCUMENT_BYTES },
});

function parseType(value: string): TravelerDocumentType {
  if (!Object.values(TravelerDocumentType).includes(value as TravelerDocumentType)) {
    throw new BadRequestException(`Unknown document type: ${value}`);
  }
  return value as TravelerDocumentType;
}

/**
 * Bytes always leave through a handler, never a static path, and always with a
 * Content-Disposition of attachment — an inline HTML or SVG served from the
 * API's own origin would otherwise be a scripting vector against the session
 * that just fetched it.
 */
function sendFile(res: Response, row: { label: string; mimeType: string }, buffer: Buffer) {
  res.setHeader('Content-Type', row.mimeType);
  res.setHeader('Content-Disposition', `attachment; filename="${row.label.replace(/["\r\n]/g, '')}"`);
  res.setHeader('Cache-Control', 'private, no-store');
  res.send(buffer);
}

@UseGuards(TravelerAuthGuard)
@Controller('traveler/documents')
export class TravelerDocumentsController {
  constructor(private readonly documents: TravelerDocumentsService) {}

  @Get()
  list(@Req() req: TravelerRequest) {
    return this.documents.listForTraveller(req.travelerSession);
  }

  @Post()
  @UseInterceptors(UPLOAD)
  upload(
    @Req() req: TravelerRequest,
    @UploadedFile() file: Express.Multer.File,
    @Body('type') type: string,
    @Body('label') label: string,
  ) {
    return this.documents.uploadAsTraveller(
      req.travelerSession,
      file,
      parseType(type),
      label?.trim() || file?.originalname || 'Document',
    );
  }

  @Get(':id/file')
  async download(@Param('id') id: string, @Req() req: TravelerRequest, @Res() res: Response) {
    const { row, buffer } = await this.documents.readForTraveller(id, req.travelerSession);
    sendFile(res, row, buffer);
  }

  @Delete(':id')
  remove(@Param('id') id: string, @Req() req: TravelerRequest) {
    return this.documents.removeAsTraveller(id, req.travelerSession);
  }
}

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller()
export class StaffTravelerDocumentsController {
  constructor(private readonly documents: TravelerDocumentsService) {}

  @Roles(...OPS_ROLES)
  @Get('bookings/:bookingId/documents')
  list(@Param('bookingId') bookingId: string, @Req() req: StaffRequest) {
    return this.documents.listForStaff(bookingId, req.user);
  }

  @Roles(...OPS_ROLES)
  @Post('bookings/:bookingId/documents')
  @UseInterceptors(UPLOAD)
  upload(
    @Param('bookingId') bookingId: string,
    @Req() req: StaffRequest,
    @UploadedFile() file: Express.Multer.File,
    @Body('type') type: string,
    @Body('label') label: string,
    @Body('travelerId') travelerId?: string,
  ) {
    return this.documents.uploadAsStaff(
      bookingId,
      req.user,
      file,
      parseType(type),
      label?.trim() || file?.originalname || 'Document',
      travelerId || undefined,
    );
  }

  @Roles(...OPS_ROLES)
  @Get('traveler-documents/:id/file')
  async download(@Param('id') id: string, @Req() req: StaffRequest, @Res() res: Response) {
    const { row, buffer } = await this.documents.readForStaff(id, req.user);
    sendFile(res, row, buffer);
  }

  @Roles(...OPS_ROLES)
  @Delete('traveler-documents/:id')
  remove(@Param('id') id: string, @Req() req: StaffRequest) {
    return this.documents.removeAsStaff(id, req.user);
  }
}
