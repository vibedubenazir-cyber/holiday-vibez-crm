import { IsIn, IsOptional, IsString } from 'class-validator';

export class UpdatePolicyStatusDto {
  @IsIn(['ACTIVE', 'CLAIMED', 'EXPIRED', 'CANCELLED'])
  status!: 'ACTIVE' | 'CLAIMED' | 'EXPIRED' | 'CANCELLED';

  @IsOptional()
  @IsString()
  claimNotes?: string;
}
