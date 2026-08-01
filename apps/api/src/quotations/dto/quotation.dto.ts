import { IsInt, IsOptional, IsString, Min } from 'class-validator';

export class CreateQuotationDto {
  @IsString()
  leadId!: string;
}

export class AddQuotationItemDto {
  @IsString()
  rateCardId!: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  quantity?: number;
}

export class RejectQuotationDto {
  @IsOptional()
  @IsString()
  comments?: string;
}
