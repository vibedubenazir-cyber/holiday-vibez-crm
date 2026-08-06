import { IsIn } from 'class-validator';

export class UpdateBookingStatusDto {
  @IsIn(['PENDING', 'CONFIRMED', 'CANCELLED', 'COMPLETED'])
  status!: 'PENDING' | 'CONFIRMED' | 'CANCELLED' | 'COMPLETED';
}
