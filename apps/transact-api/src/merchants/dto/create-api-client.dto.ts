import { IsEnum, IsString, MinLength } from 'class-validator';

export enum SourceSystemDto {
  GOLINK_COLLECT = 'GOLINK_COLLECT',
  ODOO_ERP = 'ODOO_ERP',
  MERCHANT_POS = 'MERCHANT_POS',
  OTHER = 'OTHER',
}

export class CreateApiClientDto {
  @IsString()
  @MinLength(2)
  name!: string;

  @IsEnum(SourceSystemDto)
  sourceSystem!: SourceSystemDto;
}
