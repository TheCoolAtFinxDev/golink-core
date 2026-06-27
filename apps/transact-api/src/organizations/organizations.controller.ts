import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, IsOptional, IsString, Min } from 'class-validator';
import { AdminJwtGuard } from '../admin-auth/admin-jwt.guard';
import { PermissionGuard } from '../auth/guards/permission.guard';
import { RequirePermission } from '../auth/decorators/require-permission.decorator';
import { PermissionCodes } from '../auth/permissions.constants';
import { PrismaService } from '../prisma/prisma.service';

class ListOrganizationsQuery {
  @IsOptional() @IsString() q?: string;
  @IsOptional() @IsString() type?: string;
  @IsOptional() @IsString() isActive?: string;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) page?: number = 1;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) pageSize?: number = 20;
}

@ApiTags('Organizations')
@ApiBearerAuth()
@UseGuards(AdminJwtGuard, PermissionGuard)
@Controller('organizations')
export class OrganizationsController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  @RequirePermission(PermissionCodes.MERCHANTS_READ)
  @ApiOperation({ summary: 'List merchants as organizations (portal compatibility)' })
  async findAll(@Query() query: ListOrganizationsQuery) {
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 20;

    const where: any = {};
    if (query.q?.trim()) {
      where.OR = [
        { name: { contains: query.q.trim(), mode: 'insensitive' } },
        { slug: { contains: query.q.trim(), mode: 'insensitive' } },
      ];
    }
    if (query.isActive !== undefined) {
      where.status = query.isActive === 'true' ? 'ACTIVE' : 'SUSPENDED';
    }

    const [items, total] = await Promise.all([
      this.prisma.merchant.findMany({
        where,
        skip: (page - 1) * pageSize,
        take: pageSize,
        orderBy: { name: 'asc' },
      }),
      this.prisma.merchant.count({ where }),
    ]);

    return {
      page,
      pageSize,
      total,
      items: items.map((m) => this.toOrg(m)),
    };
  }

  @Get(':id')
  @RequirePermission(PermissionCodes.MERCHANTS_READ)
  @ApiOperation({ summary: 'Get merchant by id as organization' })
  async findOne(@Param('id') id: string) {
    const m = await this.prisma.merchant.findUnique({ where: { id } });
    if (!m) return null;
    return this.toOrg(m);
  }

  private toOrg(m: any) {
    return {
      id: m.id,
      type: 'MERCHANT' as const,
      name: m.name,
      code: m.slug,
      isActive: m.status === 'ACTIVE',
      readinessStatus: m.readinessStatus ?? 'DRAFT',
      billingStatus: m.billingStatus ?? 'NOT_CONFIGURED',
      billingCurrency: m.billingCurrency ?? null,
      lagoCustomerId: m.lagoCustomerId ?? null,
      stats: { members: 0, billers: 0, bills: 0, subscriptions: 0, payments: 0 },
      createdAt: m.createdAt,
      updatedAt: m.updatedAt,
    };
  }
}
