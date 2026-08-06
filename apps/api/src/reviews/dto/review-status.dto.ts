import { IsIn } from 'class-validator';

export class ReviewStatusDto {
  @IsIn(['APPROVED', 'REJECTED'])
  status!: 'APPROVED' | 'REJECTED';
}
