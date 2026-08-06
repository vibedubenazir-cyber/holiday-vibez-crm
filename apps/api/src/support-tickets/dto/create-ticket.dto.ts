import { IsIn, IsOptional, IsString } from 'class-validator';

export class CreateTicketDto {
  @IsString()
  subject!: string;

  @IsString()
  description!: string;

  @IsOptional()
  @IsIn(['LOW', 'MEDIUM', 'HIGH', 'URGENT'])
  priority?: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';

  @IsOptional()
  @IsString()
  assignedToId?: string;
}
