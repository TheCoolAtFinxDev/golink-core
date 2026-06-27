import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ApiHeader, ApiOperation, ApiSecurity, ApiTags } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsString, Matches } from 'class-validator';
import { ApiKeyGuard } from '../auth/api-key.guard';
import { ApiClient } from '../auth/api-key-context.decorator';
import type { ApiClientContext } from '../auth/api-key.guard';
import { StoredPaymentMethodsService } from './stored-payment-methods.service';

class RegisterMobileWalletDto {
  @IsEnum(['MPESA', 'ECOCASH'])
  walletRail!: 'MPESA' | 'ECOCASH';

  @IsString()
  @Matches(/^266\d{8}$/, { message: 'mobileNumber must be in 266XXXXXXXX format' })
  mobileNumber!: string;

  @IsOptional() @IsString()
  customerId?: string;
}

@ApiTags('Stored Payment Methods')
@ApiSecurity('ApiKey')
@ApiHeader({ name: 'X-Api-Key', required: true })
@Controller('stored-payment-methods')
@UseGuards(ApiKeyGuard)
export class StoredPaymentMethodsController {
  constructor(private readonly service: StoredPaymentMethodsService) {}

  @Post('mobile-wallet')
  @ApiOperation({
    summary: 'Register a mobile wallet for recurring payments',
    description: `Registers a customer's mobile number as a stored payment method for use in subscriptions.
Card tokens are registered automatically during the 3DS card enrollment flow — use this endpoint for M-PESA and EcoCash wallets only.`,
  })
  register(@Body() dto: RegisterMobileWalletDto, @ApiClient() client: ApiClientContext) {
    return this.service.registerMobileWallet(client.merchantId, dto);
  }

  @Get()
  @ApiOperation({ summary: 'List stored payment methods for this merchant' })
  list(@ApiClient() client: ApiClientContext) {
    return this.service.list(client.merchantId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a stored payment method' })
  findOne(@Param('id') id: string, @ApiClient() client: ApiClientContext) {
    return this.service.findOne(id, client.merchantId);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Deactivate a stored payment method' })
  deactivate(@Param('id') id: string, @ApiClient() client: ApiClientContext) {
    return this.service.deactivate(id, client.merchantId);
  }
}
