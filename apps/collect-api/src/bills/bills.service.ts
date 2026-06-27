import { Injectable, NotFoundException } from '@nestjs/common';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsInt, IsOptional, IsString, Min } from 'class-validator';
import { BillStatus, BillType, CollectionRail, GolinkProduct, SubscriptionInterval } from '../../generated/prisma';
import { PrismaService } from '../prisma/prisma.service';

export class CreateBillDto {
  @ApiProperty() @IsString() externalBillId!: string;
  @ApiProperty() @IsString() organizationId!: string;
  @ApiProperty() @IsString() billerId!: string;
  @ApiPropertyOptional() @IsOptional() @IsString() customerId?: string;
  @ApiPropertyOptional({ enum: BillType }) @IsOptional() @IsEnum(BillType) type?: BillType;
  @ApiPropertyOptional({ enum: GolinkProduct }) @IsOptional() @IsEnum(GolinkProduct) product?: GolinkProduct;
  @ApiPropertyOptional({ enum: CollectionRail }) @IsOptional() @IsEnum(CollectionRail) collectionRail?: CollectionRail;
  @ApiProperty() @IsInt() @Min(1) amount!: number;
  @ApiProperty() @IsString() currency!: string;
  @ApiPropertyOptional() @IsOptional() @IsString() description?: string;
  @ApiPropertyOptional({ enum: SubscriptionInterval }) @IsOptional() @IsEnum(SubscriptionInterval) interval?: SubscriptionInterval;
}

@Injectable()
export class BillsService {
  constructor(private readonly prisma: PrismaService) {}

  create(dto: CreateBillDto) {
    return this.prisma.bill.create({ data: dto });
  }

  findAll(opts: { organizationId?: string; billerId?: string; status?: BillStatus; customerId?: string }) {
    return this.prisma.bill.findMany({
      where: {
        organizationId: opts.organizationId,
        billerId: opts.billerId,
        customerId: opts.customerId,
        status: opts.status,
      },
      include: { paymentProjections: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: string) {
    const bill = await this.prisma.bill.findUnique({
      where: { id },
      include: { paymentProjections: true, customer: true, biller: true },
    });
    if (!bill) throw new NotFoundException(`Bill ${id} not found`);
    return bill;
  }

  async findByExternalId(externalBillId: string) {
    const bill = await this.prisma.bill.findUnique({
      where: { externalBillId },
      include: { paymentProjections: true },
    });
    if (!bill) throw new NotFoundException(`Bill with externalBillId ${externalBillId} not found`);
    return bill;
  }

  async updateStatus(id: string, status: BillStatus) {
    await this.findOne(id);
    return this.prisma.bill.update({ where: { id }, data: { status } });
  }
}
