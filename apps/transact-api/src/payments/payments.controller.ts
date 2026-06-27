import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiSecurity, ApiTags, ApiHeader, ApiResponse, ApiParam } from '@nestjs/swagger';
import {
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsObject,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';

class RefundPaymentDto {
  @IsOptional() @IsInt() @Min(1)
  amountMinor?: number;

  @IsOptional() @IsString()
  reason?: string;
}
import { ApiKeyGuard } from '../auth/api-key.guard';
import { ApiClient } from '../auth/api-key-context.decorator';
import type { ApiClientContext } from '../auth/api-key.guard';
import { AdminJwtGuard } from '../admin-auth/admin-jwt.guard';
import { PermissionGuard } from '../auth/guards/permission.guard';
import { RequirePermission } from '../auth/decorators/require-permission.decorator';
import { PermissionCodes } from '../auth/permissions.constants';
import { AuthUser } from '../auth/auth.types';
import { ApprovalsService } from '../approvals/approvals.service';
import { PaymentsService } from './payments.service';
import { CreatePaymentDto } from './dto/create-payment.dto';

class AdminPaymentActionDto {
  @IsOptional() @IsString() reason?: string;
}

class AdminCreatePaymentDto {
  @IsNotEmpty() @IsString() merchantId!: string;
  @IsEnum(['DEBIT', 'CREDIT']) direction!: 'DEBIT' | 'CREDIT';
  @IsEnum(['CARD', 'MPESA', 'ECOCASH', 'EFT']) rail!: 'CARD' | 'MPESA' | 'ECOCASH' | 'EFT';
  @IsInt() @Min(1) amountMinor!: number;
  @IsNotEmpty() @IsString() currency!: string;
  @IsObject() payer!: Record<string, unknown>;
  @IsObject() payee!: Record<string, unknown>;
  @IsOptional() @IsString() description?: string;
  @IsOptional() @IsString() sourceReference?: string;
}

@ApiTags('Payments')
@ApiSecurity('ApiKey')
@ApiHeader({
  name: 'X-Api-Key',
  description: 'Merchant API key — format: glk_live_<key>. Obtained from the Golink Transact portal.',
  required: true,
})
@Controller('payments')
@UseGuards(ApiKeyGuard)
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  @Post()
  @ApiOperation({
    summary: 'Submit a payment instruction',
    description: `
Submits a payment instruction to the Golink Transact gateway. The gateway routes the request
to the appropriate PSP based on the \`rail\` field and the merchant's configured PSP settings.

**Idempotency:** Requests with the same \`idempotencyKey\` (scoped per merchant) return the
original response without re-executing. Safe to retry on network failures.

**Supported rails:**
- \`MPESA\` — Vodacom M-PESA (Lesotho). \`payer.phone\` required in \`266XXXXXXXX\` format.
- \`ECOCASH\` — Econet EcoCash. \`payer.phone\` required.
- \`CARD\` — iVeri card acquiring. \`cardData\` required. Supports 3DS.
- \`EFT\` — Nedbank CPS batch EFT.

**Response statuses:**
- \`PENDING\` / \`PROCESSING\` — Payment queued or awaiting PSP confirmation
- \`SUCCEEDED\` — Payment completed successfully
- \`FAILED\` — Payment rejected by PSP (see execution \`responsePayload\` for reason)
    `.trim(),
  })
  @ApiResponse({ status: 200, description: 'Payment instruction created and executed' })
  @ApiResponse({ status: 422, description: 'No active PSP config for the requested rail' })
  @ApiResponse({ status: 401, description: 'Invalid or missing API key' })
  submit(
    @Body() dto: CreatePaymentDto,
    @ApiClient() client: ApiClientContext,
  ) {
    return this.paymentsService.submit(dto, client);
  }

  @Get(':id')
  @ApiOperation({
    summary: 'Get a payment instruction',
    description: 'Returns the payment instruction and its latest execution attempt. Scoped to the calling merchant.',
  })
  @ApiParam({ name: 'id', description: 'Payment instruction UUID' })
  @ApiResponse({ status: 200, description: 'Payment instruction with executions and splits' })
  @ApiResponse({ status: 404, description: 'Payment not found or belongs to a different merchant' })
  findOne(
    @Param('id') id: string,
    @ApiClient() client: ApiClientContext,
  ) {
    return this.paymentsService.findOne(id, client.merchantId);
  }

  @Post(':id/refund')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Refund a payment',
    description: `Issues a refund (CREDIT) against a previously SUCCEEDED payment.

**Supported rails:**
- \`CARD\` — Full iVeri credit against the original \`TransactionIndex\`. Synchronous result.
- \`MPESA\` / \`ECOCASH\` — Mobile money reversals are on the roadmap; currently returns an error.

**Partial refunds:** Supply \`amountMinor\` to refund less than the full amount. If omitted the full original amount is refunded.

**One refund per payment:** Only one refund is permitted per original payment instruction. Contact support for exceptional cases.

On success a \`payment.refunded\` webhook event is dispatched to all registered endpoints.`,
  })
  @ApiParam({ name: 'id', description: 'Original payment instruction UUID' })
  @ApiResponse({ status: 200, description: 'Refund instruction created and executed' })
  @ApiResponse({ status: 422, description: 'Payment not SUCCEEDED, amount exceeds original, or duplicate refund' })
  refund(
    @Param('id') id: string,
    @Body() dto: RefundPaymentDto,
    @ApiClient() client: ApiClientContext,
  ) {
    return this.paymentsService.refund(id, client.merchantId, dto.amountMinor, dto.reason);
  }
}

@ApiTags('Payments (Admin)')
@ApiBearerAuth()
@UseGuards(AdminJwtGuard, PermissionGuard)
@Controller('admin/payments')
export class AdminPaymentsController {
  constructor(
    private readonly paymentsService: PaymentsService,
    private readonly approvals: ApprovalsService,
  ) {}

  @Get()
  @RequirePermission(PermissionCodes.PAYMENTS_READ)
  @ApiOperation({ summary: 'List payments (admin)' })
  findAll(@Query('merchantId') merchantId?: string) {
    return this.paymentsService.findAllAdmin(merchantId);
  }

  @Get(':id')
  @RequirePermission(PermissionCodes.PAYMENTS_READ)
  @ApiOperation({ summary: 'Get a payment (admin)' })
  findOne(@Param('id') id: string) {
    return this.paymentsService.findOneAdmin(id);
  }

  @Post(':id/cancel')
  @RequirePermission(PermissionCodes.PAYMENTS_CANCEL)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Cancel a payment (may require 4-eyes approval)' })
  async cancel(
    @Param('id') id: string,
    @Body() dto: AdminPaymentActionDto,
    @Req() req: { user: AuthUser },
  ) {
    if (req.user.permissionsRequiring4Eyes.includes(PermissionCodes.PAYMENTS_CANCEL)) {
      const approval = await this.approvals.create(req.user, {
        action: 'payments.cancel',
        resourceType: 'PaymentInstruction',
        resourceId: id,
        payload: { paymentId: id, reason: dto.reason },
        requesterNotes: dto.reason,
      });
      return { queued: true, approvalRequest: approval };
    }
    return this.paymentsService.cancel(id);
  }

  @Post(':id/refund')
  @RequirePermission(PermissionCodes.PAYMENTS_REFUND)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Initiate a refund — always requires 4-eyes approval' })
  async refund(
    @Param('id') id: string,
    @Body() dto: AdminPaymentActionDto,
    @Req() req: { user: AuthUser },
  ) {
    const approval = await this.approvals.create(req.user, {
      action: 'payments.refund',
      resourceType: 'PaymentInstruction',
      resourceId: id,
      payload: { paymentId: id, reason: dto.reason },
      requesterNotes: dto.reason,
    });
    return { queued: true, approvalRequest: approval };
  }

  @Post(':id/retry')
  @RequirePermission(PermissionCodes.PAYMENTS_RETRY)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Retry a failed payment' })
  retry(@Param('id') id: string) {
    return this.paymentsService.retry(id);
  }

  @Post()
  @RequirePermission(PermissionCodes.PAYMENTS_CREATE)
  @ApiOperation({ summary: 'Admin-create a payment instruction' })
  adminCreate(@Body() dto: AdminCreatePaymentDto) {
    return this.paymentsService.adminCreate(dto);
  }
}

@Controller('psp')
export class PspCallbackController {
  constructor(private readonly paymentsService: PaymentsService) {}

  @Post('mpesa/callback')
  mpesaCallback(@Body() body: unknown) {
    return this.paymentsService.handlePspCallback('MPESA', body);
  }

  @Post('ecocash/callback')
  ecocashCallback(@Body() body: unknown) {
    return this.paymentsService.handlePspCallback('ECOCASH', body);
  }
}
