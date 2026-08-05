import { Module } from '@nestjs/common';
import { ClientsController } from './clients.controller';
import { ClientsService } from './clients.service';
import { PrismaService } from '../prisma.service';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [AuthModule],
  controllers: [ClientsController],
  providers: [ClientsService, PrismaService],
  exports: [ClientsService],
})
export class ClientsModule {}
