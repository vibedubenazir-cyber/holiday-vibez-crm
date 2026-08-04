import { Module } from '@nestjs/common';
import { CmsController } from './cms.controller';
import { PublicCmsController } from './public-cms.controller';
import { CmsService } from './cms.service';
import { PrismaService } from '../prisma.service';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [AuthModule],
  controllers: [CmsController, PublicCmsController],
  providers: [CmsService, PrismaService],
  exports: [CmsService],
})
export class CmsModule {}
