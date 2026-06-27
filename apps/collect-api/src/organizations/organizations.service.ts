import { Injectable, NotFoundException } from '@nestjs/common';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsEnum, IsOptional, IsString } from 'class-validator';
import { OrganizationType } from '../../generated/prisma';
import { PrismaService } from '../prisma/prisma.service';

export class CreateOrganizationDto {
  @ApiProperty({ enum: OrganizationType }) @IsEnum(OrganizationType) type!: OrganizationType;
  @ApiProperty() @IsString() name!: string;
  @ApiProperty() @IsString() code!: string;
  @ApiPropertyOptional() @IsOptional() @IsString() logoUrl?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() contactEmail?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() externalRef?: string;
}

export class CreateBillerDto {
  @ApiProperty() @IsString() name!: string;
  @ApiProperty() @IsString() code!: string;
  @ApiPropertyOptional() @IsOptional() @IsString() callbackUrl?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() defaultCurrency?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() profile?: string;
}

export class UpdateOrganizationDto {
  @ApiPropertyOptional() @IsOptional() @IsString() name?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() logoUrl?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() contactEmail?: string;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() isActive?: boolean;
}

@Injectable()
export class OrganizationsService {
  constructor(private readonly prisma: PrismaService) {}

  create(dto: CreateOrganizationDto) {
    return this.prisma.organization.create({ data: dto });
  }

  findAll(type?: OrganizationType) {
    return this.prisma.organization.findMany({
      where: type ? { type } : undefined,
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: string) {
    const org = await this.prisma.organization.findUnique({
      where: { id },
      include: { billers: true, billingProfile: true, complianceProfile: true },
    });
    if (!org) throw new NotFoundException(`Organization ${id} not found`);
    return org;
  }

  async update(id: string, dto: UpdateOrganizationDto) {
    await this.findOne(id);
    return this.prisma.organization.update({ where: { id }, data: dto });
  }

  addBiller(organizationId: string, dto: CreateBillerDto) {
    return this.prisma.biller.create({ data: { ...dto, organizationId } });
  }

  findBillers(organizationId: string) {
    return this.prisma.biller.findMany({ where: { organizationId } });
  }
}
