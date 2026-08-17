import { Module } from '@nestjs/common';
import { HrCalendarController } from './hr-calendar.controller';
import { HrCalendarService } from './hr-calendar.service';
import { PrismaService } from '../prisma.service';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [AuthModule],
  controllers: [HrCalendarController],
  providers: [HrCalendarService, PrismaService],
  // LeaveModule and AttendanceModule import this to exclude holidays from
  // leave day-counting and from absence marking.
  exports: [HrCalendarService],
})
export class HrCalendarModule {}
