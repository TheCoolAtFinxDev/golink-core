import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ApiHeader, ApiOperation, ApiSecurity, ApiTags } from '@nestjs/swagger';
import {
  IsEnum,
  IsInt,
  IsISO8601,
  IsObject,
  IsOptional,
  IsString,
  Matches,
  Min,
} from 'class-validator';
import { ApiKeyGuard } from '../auth/api-key.guard';
import { ApiClient } from '../auth/api-key-context.decorator';
import type { ApiClientContext } from '../auth/api-key.guard';
import { SubscriptionsService } from './subscriptions.service';

class CreateSubscriptionDto {
  @IsString()
  storedPaymentMethodId!: string;

  @IsInt() @Min(1)
  amountMinor!: number;

  @IsString() @Matches(/^[A-Z]{3}$/)
  currency!: string;

  @IsEnum(['DAILY', 'WEEKLY', 'MONTHLY'])
  interval!: 'DAILY' | 'WEEKLY' | 'MONTHLY';

  @IsOptional() @IsISO8601()
  startAt?: string;

  @IsOptional() @IsInt() @Min(1)
  maxAttempts?: number;

  @IsOptional() @IsString()
  description?: string;

  @IsOptional() @IsString()
  sourceReference?: string;

  @IsOptional() @IsObject()
  metadata?: Record<string, unknown>;

  @IsOptional() @IsObject()
  payer?: Record<string, unknown>;
}

@ApiTags('Subscriptions')
@ApiSecurity('ApiKey')
@ApiHeader({ name: 'X-Api-Key', required: true })
@Controller('subscriptions')
@UseGuards(ApiKeyGuard)
export class SubscriptionsController {
  constructor(private readonly service: SubscriptionsService) {}

  @Post()
  @ApiOperation({
    summary: 'Create a recurring subscription',
    description: `Creates a recurring payment subscription against a stored payment method.

**Intervals:** DAILY, WEEKLY, MONTHLY

**Card subscriptions:** Automatically use iVeri MIT (Merchant-Initiated Transaction) — no customer action required per cycle.

**Mobile money subscriptions (MPESA/ECOCASH):** Triggers a USSD push to the customer's phone each billing cycle. The customer must approve on their handset. True mandate-based direct debit is on the roadmap.

**Retry policy (card):** On synchronous failure, the scheduler retries the next day. After \`maxAttempts\` consecutive failures the subscription is marked EXHAUSTED.

Use \`startAt\` (ISO 8601) to schedule the first charge — defaults to immediately.`,
  })
  create(@Body() dto: CreateSubscriptionDto, @ApiClient() client: ApiClientContext) {
    return this.service.create(client.merchantId, dto);
  }

  @Get()
  @ApiOperation({ summary: 'List subscriptions for this merchant' })
  findAll(@ApiClient() client: ApiClientContext) {
    return this.service.findAll(client.merchantId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a subscription with its recent payment history' })
  findOne(@Param('id') id: string, @ApiClient() client: ApiClientContext) {
    return this.service.findOne(id, client.merchantId);
  }

  @Post(':id/pause')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Pause an active subscription — no charges until resumed' })
  pause(@Param('id') id: string, @ApiClient() client: ApiClientContext) {
    return this.service.pause(id, client.merchantId);
  }

  @Post(':id/resume')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Resume a paused subscription' })
  resume(@Param('id') id: string, @ApiClient() client: ApiClientContext) {
    return this.service.resume(id, client.merchantId);
  }

  @Post(':id/cancel')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Cancel a subscription permanently' })
  cancel(@Param('id') id: string, @ApiClient() client: ApiClientContext) {
    return this.service.cancel(id, client.merchantId);
  }
}
