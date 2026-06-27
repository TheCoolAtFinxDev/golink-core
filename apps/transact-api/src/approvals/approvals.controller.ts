import {
  Body, Controller, Delete, Get, Param, Post, Query, Req, UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';
import { AdminJwtGuard } from '../admin-auth/admin-jwt.guard';
import { PermissionGuard } from '../auth/guards/permission.guard';
import { RequirePermission } from '../auth/decorators/require-permission.decorator';
import { PermissionCodes } from '../auth/permissions.constants';
import { AuthUser } from '../auth/auth.types';
import { ApprovalsService } from './approvals.service';

class ReviewDto {
  @IsOptional() @IsString() notes?: string;
}

@ApiTags('Approvals')
@ApiBearerAuth()
@UseGuards(AdminJwtGuard, PermissionGuard)
@Controller('approvals')
export class ApprovalsController {
  constructor(private readonly approvals: ApprovalsService) {}

  @Get()
  @RequirePermission(PermissionCodes.APPROVALS_READ)
  @ApiOperation({ summary: 'List approval requests' })
  findAll(@Req() req: { user: AuthUser }, @Query('status') status?: string) {
    return this.approvals.findAll(req.user, status);
  }

  @Get(':id')
  @RequirePermission(PermissionCodes.APPROVALS_READ)
  @ApiOperation({ summary: 'Get an approval request' })
  findOne(@Param('id') id: string) {
    return this.approvals.findOne(id);
  }

  @Post(':id/approve')
  @RequirePermission(PermissionCodes.APPROVALS_REVIEW)
  @ApiOperation({ summary: 'Approve a pending request (must not be the requester)' })
  approve(@Req() req: { user: AuthUser }, @Param('id') id: string, @Body() dto: ReviewDto) {
    return this.approvals.approve(req.user, id, dto.notes);
  }

  @Post(':id/reject')
  @RequirePermission(PermissionCodes.APPROVALS_REVIEW)
  @ApiOperation({ summary: 'Reject a pending request' })
  reject(@Req() req: { user: AuthUser }, @Param('id') id: string, @Body() dto: ReviewDto) {
    return this.approvals.reject(req.user, id, dto.notes);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Cancel a pending request (requester only)' })
  cancel(@Req() req: { user: AuthUser }, @Param('id') id: string) {
    return this.approvals.cancel(req.user, id);
  }
}
