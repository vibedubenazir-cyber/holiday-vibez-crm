import { Controller, Post, UploadedFile, UseGuards, UseInterceptors, BadRequestException } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname } from 'path';
import { randomUUID } from 'crypto';
import { Role } from '@prisma/client';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';

const ALLOWED_EXTENSIONS = ['.png', '.jpg', '.jpeg', '.gif', '.webp', '.pdf'];
const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024; // 5MB

/**
 * No object-storage credential (S3/GCS) exists in this environment —
 * OBJECT_STORAGE_KEY in .env.example is unset — so this writes to local disk
 * under apps/api/uploads/, served statically (see main.ts's useStaticAssets).
 * Swapping to real object storage means replacing this one handler's storage
 * engine, not touching any caller — every form that takes an image URL today
 * (CMS content, Package cover images) just needs a URL string back.
 */
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('storage')
export class StorageController {
  @Roles(Role.ADMIN, Role.DIRECTOR, Role.BRANCH_MANAGER)
  @Post('upload')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: diskStorage({
        destination: './uploads',
        filename: (_req, file, cb) => {
          const ext = extname(file.originalname).toLowerCase();
          cb(null, `${randomUUID()}${ext}`);
        },
      }),
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
  upload(@UploadedFile() file: Express.Multer.File) {
    if (!file) throw new BadRequestException('No file uploaded');
    return {
      url: `/uploads/${file.filename}`,
      originalName: file.originalname,
      sizeBytes: file.size,
    };
  }
}
