import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { IsBoolean, IsOptional } from 'class-validator';
import { AdminJwtGuard } from '../admin-auth/admin-jwt.guard';
import { PermissionGuard } from '../auth/guards/permission.guard';
import { RequirePermission } from '../auth/decorators/require-permission.decorator';
import { PermissionCodes } from '../auth/permissions.constants';
import { PayoutsService } from './payouts.service';

class TriggerPayoutRunDto {
  @IsOptional() @IsBoolean()
  dryRun?: boolean;
}

@ApiTags('Payouts (Admin)')
@ApiBearerAuth()
@UseGuards(AdminJwtGuard, PermissionGuard)
@Controller('admin/payouts')
export class PayoutsController {
  constructor(private readonly payoutsService: PayoutsService) {}

  @Get('summary')
  @RequirePermission(PermissionCodes.PAYMENTS_READ)
  @ApiOperation({
    summary: 'Pending payout summary',
    description: 'Returns the count and total amount of PENDING CREDIT split instructions awaiting the next payout run.',
  })
  summary() {
    return this.payoutsService.summary();
  }

  @Post('run')
  @RequirePermission(PermissionCodes.PAYMENTS_CREATE)
  @ApiOperation({
    summary: 'Trigger a payout run',
    description: `Executes all PENDING CREDIT split instructions — transfers funds to each recipient merchant's registered settlement account.

**Dry run:** Set \`dryRun: true\` to see what would be processed without executing any transfers.

A payout run also executes automatically every day at 02:00 UTC. Triggering manually is useful after configuring new settlement accounts or after a period of high collection volume.`,
  })
  run(@Body() dto: TriggerPayoutRunDto) {
    return this.payoutsService.run(dto.dryRun ?? false);
  }
}
