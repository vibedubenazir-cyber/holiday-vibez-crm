import { Module } from '@nestjs/common';
import { CustomFieldsController } from './custom-fields.controller';
import { CustomFieldsService } from './custom-fields.service';
import { PrismaService } from '../prisma.service';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [AuthModule],
  controllers: [CustomFieldsController],
  providers: [CustomFieldsService, PrismaService],
  exports: [CustomFieldsService],
})
export class CustomFieldsModule {}
