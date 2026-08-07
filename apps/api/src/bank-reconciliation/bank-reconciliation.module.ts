import { Module } from '@nestjs/common';
import { BankReconciliationController } from './bank-reconciliation.controller';
import { BankReconciliationService } from './bank-reconciliation.service';
import { PrismaService } from '../prisma.service';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [AuthModule],
  controllers: [BankReconciliationController],
  providers: [BankReconciliationService, PrismaService],
  exports: [BankReconciliationService],
})
export class BankReconciliationModule {}
