import { Body, Controller, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { IsEnum } from 'class-validator';
import { BillStatus } from '../../generated/prisma';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { BillsService, CreateBillDto } from './bills.service';
import { ApiProperty } from '@nestjs/swagger';

class UpdateBillStatusDto {
  @ApiProperty({ enum: BillStatus }) @IsEnum(BillStatus) status!: BillStatus;
}

@ApiTags('bills')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('bills')
export class BillsController {
  constructor(private readonly bills: BillsService) {}

  @Post()
  @ApiOperation({ summary: 'Create a bill' })
  create(@Body() dto: CreateBillDto) {
    return this.bills.create(dto);
  }

  @Get()
  @ApiOperation({ summary: 'List bills' })
  findAll(
    @Query('organizationId') organizationId?: string,
    @Query('billerId') billerId?: string,
    @Query('status') status?: BillStatus,
    @Query('customerId') customerId?: string,
  ) {
    return this.bills.findAll({ organizationId, billerId, status, customerId });
  }

  @Get('by-external/:externalBillId')
  @ApiOperation({ summary: 'Get bill by external ID' })
  findByExternalId(@Param('externalBillId') externalBillId: string) {
    return this.bills.findByExternalId(externalBillId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a bill' })
  findOne(@Param('id') id: string) {
    return this.bills.findOne(id);
  }

  @Patch(':id/status')
  @ApiOperation({ summary: 'Update bill status' })
  updateStatus(@Param('id') id: string, @Body() dto: UpdateBillStatusDto) {
    return this.bills.updateStatus(id, dto.status);
  }
}
