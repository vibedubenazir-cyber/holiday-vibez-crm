import { Controller, Get, NotFoundException, Param, Res } from '@nestjs/common';
import { Response } from 'express';
import { getPresignedUploadUrl, isS3Configured } from './s3.util';

/**
 * Handles GET /uploads/:key when S3 is configured — deliberately outside the
 * /api prefix (see main.ts's setGlobalPrefix exclude) so it lines up with the
 * plain "/uploads/xxx.jpg" paths storage.controller.ts already returns for
 * both local-disk and S3 modes.
 *
 * main.ts's static-file middleware is registered first and checks local disk
 * for every /uploads/* request; it only reaches this controller when no such
 * file exists (i.e. the app is in S3 mode, where uploads never touch disk).
 * A Railway Bucket has no public-read mode — the object 403s on a bare URL —
 * so this mints a fresh 1-hour presigned GET URL per request and redirects to
 * it, rather than storing a permanent public link that wouldn't work.
 *
 * Deliberately unauthenticated: this URL is embedded directly in <img src>
 * across public pages (the client itinerary report, the holiday-packages
 * site) that carry no bearer token.
 */
@Controller('uploads')
export class UploadsRedirectController {
  @Get(':key')
  async redirect(@Param('key') key: string, @Res() res: Response) {
    if (!isS3Configured()) throw new NotFoundException();
    const url = await getPresignedUploadUrl(key);
    res.redirect(302, url);
  }
}
