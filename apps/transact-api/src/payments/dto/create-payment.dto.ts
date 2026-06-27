import {
  IsEnum,
  IsInt,
  IsObject,
  IsOptional,
  IsString,
  IsNotEmpty,
  Matches,
  IsNumber,
  Min,
  ValidateNested,
  IsArray,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export enum DirectionDto {
  DEBIT = 'DEBIT',
  CREDIT = 'CREDIT',
}

export enum RailDto {
  CARD = 'CARD',
  MPESA = 'MPESA',
  ECOCASH = 'ECOCASH',
  EFT = 'EFT',
}

export class ThreeDsDataDto {
  @ApiPropertyOptional({ example: '05' }) @IsString() @IsOptional() eci?: string;
  @ApiPropertyOptional({ example: 'AAAAAAAAAAA=' }) @IsString() @IsOptional() cavv?: string;
  @ApiPropertyOptional() @IsString() @IsOptional() transactionId?: string;
  @ApiPropertyOptional() @IsString() @IsOptional() authenticationId?: string;
  @ApiPropertyOptional({ example: '2.1.0' }) @IsString() @IsOptional() protocolVersion?: string;
  @ApiPropertyOptional() @IsString() @IsOptional() electronicCommerceIndicator?: string;
}

export class CardDataDto {
  @ApiProperty({ description: 'Primary account number (PAN)', example: '4111111111111111' })
  @IsString() pan!: string;

  @ApiProperty({ description: 'Expiry in MMYY format', example: '1226' })
  @IsString() expiryMMYY!: string;

  @ApiPropertyOptional({ description: '3DS authentication data', type: ThreeDsDataDto })
  @IsOptional() @ValidateNested() @Type(() => ThreeDsDataDto) threeDs?: ThreeDsDataDto;
}

export class PaymentSplitDto {
  @ApiProperty({ description: 'Merchant UUID to receive this portion of the payment' })
  @IsString() @IsNotEmpty()
  merchantId!: string;

  @ApiProperty({ description: 'Amount in minor units. All splits must sum to payment amountMinor.', minimum: 1 })
  @IsInt() @Min(1)
  amountMinor!: number;

  @ApiPropertyOptional({ description: 'Label for this split, e.g. "Operator share" or "Platform fee"' })
  @IsOptional() @IsString()
  description?: string;
}

export class CreatePaymentDto {
  @ApiProperty({
    enum: DirectionDto,
    description: 'DEBIT = collect money from payer, CREDIT = send money to payee',
    example: 'DEBIT',
  })
  @IsEnum(DirectionDto)
  direction!: DirectionDto;

  @ApiProperty({
    enum: RailDto,
    description: 'Payment rail to use',
    example: 'MPESA',
  })
  @IsEnum(RailDto)
  rail!: RailDto;

  @ApiProperty({
    description: 'Unique key — same key returns the original response without re-executing',
    example: 'bill-123-attempt-1',
  })
  @IsString()
  idempotencyKey!: string;

  @ApiProperty({
    description: 'Amount in minor units (cents/lisente). LSL 10.00 = 1000',
    example: 1000,
    minimum: 1,
  })
  @IsNumber()
  @Min(1)
  amountMinor!: number;

  @ApiProperty({
    description: '3-letter ISO 4217 currency code',
    example: 'LSL',
  })
  @IsString()
  @Matches(/^[A-Z]{3}$/, { message: 'currency must be a 3-letter ISO code' })
  currency!: string;

  @ApiProperty({
    description: 'Payer identity. For MPESA/ECOCASH include phone (266XXXXXXXX). For CARD include name.',
    example: { name: 'Mohau Ramakhula', phone: '26662227190' },
  })
  @IsObject()
  payer!: Record<string, unknown>;

  @ApiProperty({
    description: 'Payee identity (the merchant/biller receiving funds)',
    example: { name: 'FinX Pty Ltd' },
  })
  @IsObject()
  payee!: Record<string, unknown>;

  @ApiPropertyOptional({
    description: 'Your internal reference for this payment (bill ID, order number, etc.)',
    example: 'BILL-2026-00123',
  })
  @IsString() @IsOptional()
  sourceReference?: string;

  @ApiPropertyOptional({
    description: 'Human-readable description shown to payer',
    example: 'Electricity bill payment',
  })
  @IsString() @IsOptional()
  description?: string;

  @ApiPropertyOptional({
    description: 'Arbitrary key-value metadata stored with the payment',
    example: { billId: 'abc123', customerId: 'cust-456' },
  })
  @IsObject() @IsOptional()
  metadata?: Record<string, unknown>;

  @ApiPropertyOptional({
    description: 'Stored card/wallet token ID for repeat payments (CARD rail)',
  })
  @IsString() @IsOptional()
  storedPaymentMethodId?: string;

  @ApiPropertyOptional({
    description: 'Subscription ID if this payment is part of a recurring schedule',
  })
  @IsString() @IsOptional()
  subscriptionId?: string;

  @ApiPropertyOptional({
    description: 'Card data for CARD rail (omit for mobile money rails)',
    type: CardDataDto,
  })
  @IsOptional() @ValidateNested() @Type(() => CardDataDto)
  cardData?: CardDataDto;

  @ApiPropertyOptional({
    description: `Optional marketplace split. Divide the collected amount across multiple merchants.
Amounts must sum exactly to amountMinor. Omit to settle the full amount to the calling merchant.
On success, Golink creates a CREDIT instruction (status: PENDING) for each split recipient — these
are settled to the recipient's wallet/account in a later payout run.`,
    type: [PaymentSplitDto],
  })
  @IsOptional() @IsArray() @ValidateNested({ each: true }) @Type(() => PaymentSplitDto)
  splits?: PaymentSplitDto[];
}

export class PspCallbackDto {
  @IsArray()
  @IsString({ each: true })
  data!: string[];
}
