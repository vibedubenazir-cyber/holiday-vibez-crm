import { Controller, Post, UploadedFile, UseGuards, UseInterceptors, BadRequestException } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { extname, join } from 'path';
import { randomUUID } from 'crypto';
import { mkdir, writeFile } from 'fs/promises';
import { Role } from '@prisma/client';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { isS3Configured, uploadToS3 } from './s3.util';

const ALLOWED_EXTENSIONS = ['.png', '.jpg', '.jpeg', '.gif', '.webp', '.pdf'];
const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024; // 5MB

/**
 * Uploads to real S3 (or any S3-compatible bucket) when OBJECT_STORAGE_ACCESS_KEY_ID/
 * OBJECT_STORAGE_KEY/OBJECT_STORAGE_BUCKET/OBJECT_STORAGE_REGION are all set; falls
 * back to local disk under apps/api/uploads/ (served statically, see main.ts's
 * useStaticAssets) otherwise. Every caller (CMS content, Package cover images) just
 * needs a URL string back either way, so nothing downstream changes.
 *
 * The local-disk path is resolved from __dirname, not process.cwd() — Railway's
 * start command runs `node apps/api/dist/main.js` from the repo root, so cwd there
 * is the repo root, not apps/api/. Writing to `${cwd}/uploads` silently wrote to a
 * directory nothing serves (and one that doesn't exist, so every upload 500'd).
 */
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('storage')
export class StorageController {
  @Roles(Role.ADMIN, Role.DIRECTOR, Role.BRANCH_MANAGER, Role.TRAVEL_CONSULTANT)
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

    return {
      url,
      originalName: file.originalname,
      sizeBytes: file.size,
    };
  }

  private async writeToLocalDisk(buffer: Buffer, key: string): Promise<string> {
    // __dirname at runtime is apps/api/dist/storage; the same apps/api/uploads
    // directory main.ts serves at /uploads/* is two levels up.
    const dir = join(__dirname, '..', '..', 'uploads');
    await mkdir(dir, { recursive: true });
    await writeFile(join(dir, key), buffer);
    return `/uploads/${key}`;
  }
}
