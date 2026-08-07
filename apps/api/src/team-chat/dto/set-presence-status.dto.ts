import { IsIn } from 'class-validator';

export class SetPresenceStatusDto {
  @IsIn(['AVAILABLE', 'BUSY'])
  status!: 'AVAILABLE' | 'BUSY';
}
