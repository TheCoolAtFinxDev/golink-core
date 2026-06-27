import { IsOptional, IsString, Length, Matches } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class InitCardDto {
  @ApiProperty({ description: 'Card PAN (digits only, no spaces)', example: '4000000000000002' })
  @IsString()
  @Matches(/^\d{12,19}$/, { message: 'pan must be 12–19 digits' })
  pan: string;

  @ApiProperty({ description: 'Expiry in MMYY format', example: '1226' })
  @IsString()
  @Length(4, 4)
  @Matches(/^\d{4}$/, { message: 'expiryMMYY must be 4 digits' })
  expiryMMYY: string;

  @ApiPropertyOptional({ description: 'Card security code (CVV)', example: '123' })
  @IsOptional()
  @IsString()
  @Length(3, 4)
  @Matches(/^\d{3,4}$/, { message: 'cvv must be 3 or 4 digits' })
  cvv?: string;

  @ApiPropertyOptional({ description: 'Payer full name' })
  @IsOptional()
  @IsString()
  payerName?: string;

  @ApiPropertyOptional({ description: 'Payer email' })
  @IsOptional()
  @IsString()
  payerEmail?: string;

  @ApiPropertyOptional({ description: 'Payer phone' })
  @IsOptional()
  @IsString()
  payerPhone?: string;
}
