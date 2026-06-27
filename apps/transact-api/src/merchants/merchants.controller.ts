import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';
import { AdminJwtGuard } from '../admin-auth/admin-jwt.guard';
import { PermissionGuard } from '../auth/guards/permission.guard';
import { RequirePermission } from '../auth/decorators/require-permission.decorator';
import { PermissionCodes } from '../auth/permissions.constants';
import { AuthUser } from '../auth/auth.types';
import { ApprovalsService } from '../approvals/approvals.service';
import { MerchantsService } from './merchants.service';
import { CreateMerchantDto, UpdateMerchantDto } from './dto/create-merchant.dto';
import { CreatePspConfigDto } from './dto/create-psp-config.dto';
import { CreateApiClientDto } from './dto/create-api-client.dto';

class SuspendMerchantDto {
  @IsOptional() @IsString() reason?: string;
}

@ApiTags('Merchants (Admin)')
@ApiBearerAuth()
@UseGuards(AdminJwtGuard, PermissionGuard)
@Controller('merchants')
export class MerchantsController {
  constructor(
    private readonly merchantsService: MerchantsService,
    private readonly approvals: ApprovalsService,
  ) {}

  @Post()
  @RequirePermission(PermissionCodes.MERCHANTS_CREATE)
  @ApiOperation({ summary: 'Create a merchant' })
  create(@Body() dto: CreateMerchantDto) {
    return this.merchantsService.create(dto);
  }

  @Get()
  @RequirePermission(PermissionCodes.MERCHANTS_READ)
  @ApiOperation({ summary: 'List merchants' })
  findAll() {
    return this.merchantsService.findAll();
  }

  @Get(':id')
  @RequirePermission(PermissionCodes.MERCHANTS_READ)
  @ApiOperation({ summary: 'Get a merchant' })
  findOne(@Param('id') id: string) {
    return this.merchantsService.findOne(id);
  }

  @Patch(':id')
  @RequirePermission(PermissionCodes.MERCHANTS_UPDATE)
  @ApiOperation({ summary: 'Update a merchant' })
  update(@Param('id') id: string, @Body() dto: UpdateMerchantDto) {
    return this.merchantsService.update(id, dto);
  }

  @Post(':id/suspend')
  @RequirePermission(PermissionCodes.MERCHANTS_SUSPEND)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Suspend a merchant (may require 4-eyes approval)' })
  async suspend(
    @Param('id') id: string,
    @Body() dto: SuspendMerchantDto,
    @Req() req: { user: AuthUser },
  ) {
    if (req.user.permissionsRequiring4Eyes.includes(PermissionCodes.MERCHANTS_SUSPEND)) {
      const approval = await this.approvals.create(req.user, {
        action: 'merchants.suspend',
        resourceType: 'Merchant',
        resourceId: id,
        payload: { merchantId: id, reason: dto.reason },
        requesterNotes: dto.reason,
      });
      return { queued: true, approvalRequest: approval };
    }
    return this.merchantsService.suspend(id);
  }

  @Post(':id/unsuspend')
  @RequirePermission(PermissionCodes.MERCHANTS_SUSPEND)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Reactivate a suspended merchant (may require 4-eyes approval)' })
  async unsuspend(
    @Param('id') id: string,
    @Body() dto: SuspendMerchantDto,
    @Req() req: { user: AuthUser },
  ) {
    if (req.user.permissionsRequiring4Eyes.includes(PermissionCodes.MERCHANTS_SUSPEND)) {
      const approval = await this.approvals.create(req.user, {
        action: 'merchants.unsuspend',
        resourceType: 'Merchant',
        resourceId: id,
        payload: { merchantId: id, reason: dto.reason },
        requesterNotes: dto.reason,
      });
      return { queued: true, approvalRequest: approval };
    }
    return this.merchantsService.unsuspend(id);
  }

  @Post(':id/psp-configs')
  @RequirePermission(PermissionCodes.MERCHANTS_PSP_MANAGE)
  @ApiOperation({ summary: 'Add or update a PSP config (may require 4-eyes approval)' })
  async addPspConfig(
    @Param('id') id: string,
    @Body() dto: CreatePspConfigDto,
    @Req() req: { user: AuthUser },
  ) {
    if (req.user.permissionsRequiring4Eyes.includes(PermissionCodes.MERCHANTS_PSP_MANAGE)) {
      const approval = await this.approvals.create(req.user, {
        action: 'merchants.psp_config.manage',
        resourceType: 'MerchantPspConfig',
        resourceId: id,
        payload: { merchantId: id, dto: dto as unknown as Record<string, unknown> },
      });
      return { queued: true, approvalRequest: approval };
    }
    return this.merchantsService.addPspConfig(id, dto);
  }

  @Post(':id/api-clients')
  @RequirePermission(PermissionCodes.MERCHANTS_API_CLIENT_MANAGE)
  @ApiOperation({ summary: 'Generate API key (may require 4-eyes approval)' })
  async generateApiKey(
    @Param('id') id: string,
    @Body() dto: CreateApiClientDto,
    @Req() req: { user: AuthUser },
  ) {
    if (req.user.permissionsRequiring4Eyes.includes(PermissionCodes.MERCHANTS_API_CLIENT_MANAGE)) {
      const approval = await this.approvals.create(req.user, {
        action: 'merchants.api_client.manage',
        resourceType: 'ApiClient',
        resourceId: id,
        payload: { merchantId: id, dto: dto as unknown as Record<string, unknown> },
      });
      return { queued: true, approvalRequest: approval };
    }
    return this.merchantsService.generateApiKey(id, dto);
  }

  @Delete(':id/api-clients/:clientId')
  @RequirePermission(PermissionCodes.MERCHANTS_API_CLIENT_MANAGE)
  @ApiOperation({ summary: 'Revoke API client' })
  revokeApiKey(@Param('id') id: string, @Param('clientId') clientId: string) {
    return this.merchantsService.revokeApiKey(id, clientId);
  }
}
