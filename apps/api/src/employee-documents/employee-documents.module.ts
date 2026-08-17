import { Module } from '@nestjs/common';
import { EmployeeDocumentsController } from './employee-documents.controller';
import { EmployeeDocumentsService } from './employee-documents.service';
import { PrismaService } from '../prisma.service';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [AuthModule],
  controllers: [EmployeeDocumentsController],
  providers: [EmployeeDocumentsService, PrismaService],
  exports: [EmployeeDocumentsService],
})
export class EmployeeDocumentsModule {}
