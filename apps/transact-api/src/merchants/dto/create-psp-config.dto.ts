import { IsBoolean, IsEnum, IsObject, IsOptional } from 'class-validator';

export enum PspRailDto {
  CARD = 'CARD',
  MPESA = 'MPESA',
  ECOCASH = 'ECOCASH',
  EFT = 'EFT',
}

export class CreatePspConfigDto {
  @IsEnum(PspRailDto)
  rail!: PspRailDto;

  @IsObject()
  config!: Record<string, unknown>;

  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}
