import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import {
  IsArray,
  IsInt,
  IsISO8601,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';
import { AdminJwtGuard } from '../admin-auth/admin-jwt.guard';
import { PermissionGuard } from '../auth/guards/permission.guard';
import { RequirePermission } from '../auth/decorators/require-permission.decorator';
import { PermissionCodes } from '../auth/permissions.constants';
import { PaymentLinksService } from './payment-links.service';

class CreatePaymentLinkDto {
  @IsNotEmpty() @IsString() merchantId!: string;
  @IsNotEmpty() @IsString() title!: string;
  @IsOptional() @IsString() description?: string;
  @IsOptional() @IsInt() @Min(1) amountMinor?: number;
  @IsNotEmpty() @IsString() currency!: string;
  @IsOptional() @IsArray() allowedRails?: string[];
  @IsOptional() @IsISO8601() expiresAt?: string;
  @IsOptional() @IsInt() @Min(1) maxUses?: number;
  @IsOptional() @IsString() recipientName?: string;
  @IsOptional() @IsString() recipientPhone?: string;
  @IsOptional() @IsString() recipientEmail?: string;
}

class NotifyPaymentLinkDto {
  @IsArray() channels!: string[];
}

@ApiTags('Payment Links (Admin)')
@ApiBearerAuth()
@UseGuards(AdminJwtGuard, PermissionGuard)
@Controller('admin/payment-links')
export class PaymentLinksController {
  constructor(private readonly service: PaymentLinksService) {}

  @Get()
  @RequirePermission(PermissionCodes.PAYMENT_LINKS_READ)
  @ApiOperation({ summary: 'List payment links' })
  findAll(@Query('merchantId') merchantId?: string) {
    return this.service.findAll(merchantId);
  }

  @Get(':id')
  @RequirePermission(PermissionCodes.PAYMENT_LINKS_READ)
  @ApiOperation({ summary: 'Get a payment link' })
  findOne(@Param('id') id: string) {
    return this.service.findOne(id);
  }

  @Post()
  @RequirePermission(PermissionCodes.PAYMENT_LINKS_MANAGE)
  @ApiOperation({ summary: 'Create a payment link' })
  create(@Body() dto: CreatePaymentLinkDto) {
    return this.service.create(dto);
  }

  @Delete(':id')
  @RequirePermission(PermissionCodes.PAYMENT_LINKS_MANAGE)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Cancel a payment link' })
  cancel(@Param('id') id: string) {
    return this.service.cancel(id);
  }

  @Post(':id/notify')
  @RequirePermission(PermissionCodes.PAYMENT_LINKS_MANAGE)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Send payment link notification via SMS/email/WhatsApp' })
  notify(@Param('id') id: string, @Body() dto: NotifyPaymentLinkDto) {
    return this.service.notify(id, dto.channels);
  }
}
