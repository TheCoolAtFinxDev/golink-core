import {
  BadRequestException, ConflictException, Injectable, NotFoundException,
} from '@nestjs/common';
import { Prisma } from '../../generated/prisma';
import { PrismaService } from '../prisma/prisma.service';
import { hashPassword } from '../auth/password.util';
import { AuthUser } from '../auth/auth.types';
import { CreateUserDto, ListUsersDto, MembershipInputDto, UpdateUserDto } from './dto/users.dto';

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  private membershipInclude(): Prisma.MerchantMembershipFindManyArgs {
    return {
      orderBy: [{ isPrimary: 'desc' }, { createdAt: 'asc' }],
      include: {
        role: { select: { id: true, name: true } },
        merchant: { select: { id: true, name: true, slug: true, status: true } },
      },
    };
  }

  private toResponse(user: any) {
    return {
      id: user.id,
      email: user.email,
      name: user.name,
      isActive: user.isActive,
      isSuperAdmin: user.isSuperAdmin,
      hasPassword: !!user.passwordHash,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
      memberships: (user.memberships ?? []).map((m: any) => ({
        id: m.id,
        organizationId: m.merchantId,
        userId: m.userId,
        role: m.role?.name ?? 'UNKNOWN',
        roleId: m.roleId,
        isActive: m.isActive,
        isPrimary: m.isPrimary,
        createdAt: m.createdAt,
        updatedAt: m.updatedAt,
        organization: {
          id: m.merchant.id,
          type: 'MERCHANT' as const,
          name: m.merchant.name,
          code: m.merchant.slug,
          isActive: m.merchant.status === 'ACTIVE',
        },
      })),
    };
  }

  private buildWhere(_actor: AuthUser, query: ListUsersDto): Prisma.SystemUserWhereInput {
    const filters: Prisma.SystemUserWhereInput[] = [];

    if (query.q?.trim()) {
      const term = query.q.trim();
      filters.push({ OR: [{ name: { contains: term, mode: 'insensitive' } }, { email: { contains: term, mode: 'insensitive' } }] });
    }

    if (query.isActive != null) {
      filters.push({ isActive: query.isActive === 'true' });
    }

    if (query.organizationId || query.role) {
      const memberWhere: Prisma.MerchantMembershipWhereInput = {};
      if (query.organizationId) memberWhere.merchantId = query.organizationId;
      if (query.role) memberWhere.role = { name: query.role };
      filters.push({ memberships: { some: memberWhere } });
    }

    return filters.length ? { AND: filters } : {};
  }

  async findAll(actor: AuthUser, query: ListUsersDto) {
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 20;
    const where = this.buildWhere(actor, query);

    const [items, total] = await Promise.all([
      this.prisma.systemUser.findMany({
        where,
        orderBy: [{ isActive: 'desc' }, { createdAt: 'desc' }],
        skip: (page - 1) * pageSize,
        take: pageSize,
        include: { memberships: this.membershipInclude() },
      }),
      this.prisma.systemUser.count({ where }),
    ]);

    return { page, pageSize, total, items: items.map((u) => this.toResponse(u)) };
  }

  async findOne(_actor: AuthUser, id: string) {
    const user = await this.prisma.systemUser.findUnique({
      where: { id },
      include: { memberships: this.membershipInclude() },
    });
    if (!user) throw new NotFoundException(`User ${id} not found`);
    return this.toResponse(user);
  }

  async create(_actor: AuthUser, dto: CreateUserDto) {
    const email = dto.email.trim().toLowerCase();
    const existing = await this.prisma.systemUser.findUnique({ where: { email }, select: { id: true } });
    if (existing) throw new ConflictException(`User ${email} already exists`);

    const passwordHash = dto.password?.trim() ? hashPassword(dto.password.trim()) : null;

    const user = await this.prisma.systemUser.create({
      data: {
        email,
        name: dto.name.trim(),
        isActive: dto.isActive ?? true,
        passwordHash,
        memberships: dto.memberships?.length
          ? { create: await this.buildMembershipCreateData(dto.memberships) }
          : undefined,
      },
      include: { memberships: this.membershipInclude() },
    });

    return this.toResponse(user);
  }

  async update(_actor: AuthUser, id: string, dto: UpdateUserDto) {
    const existing = await this.prisma.systemUser.findUnique({ where: { id }, select: { id: true, email: true } });
    if (!existing) throw new NotFoundException(`User ${id} not found`);

    const email = dto.email?.trim().toLowerCase();
    if (email && email !== existing.email) {
      const taken = await this.prisma.systemUser.findUnique({ where: { email }, select: { id: true } });
      if (taken) throw new ConflictException(`Email ${email} already in use`);
    }

    await this.prisma.systemUser.update({
      where: { id },
      data: {
        email: email || undefined,
        name: dto.name?.trim() || undefined,
        isActive: dto.isActive,
        passwordHash: dto.password?.trim() ? hashPassword(dto.password.trim()) : undefined,
      },
    });

    return this.findOne(_actor, id);
  }

  async deactivate(actor: AuthUser, id: string) {
    const existing = await this.prisma.systemUser.findUnique({ where: { id }, select: { id: true } });
    if (!existing) throw new NotFoundException(`User ${id} not found`);

    await this.prisma.$transaction([
      this.prisma.merchantMembership.updateMany({ where: { userId: id }, data: { isActive: false, isPrimary: false } }),
      this.prisma.systemUser.update({ where: { id }, data: { isActive: false } }),
    ]);

    return this.findOne(actor, id);
  }

  async addMembership(actor: AuthUser, userId: string, dto: MembershipInputDto) {
    const user = await this.prisma.systemUser.findUnique({ where: { id: userId }, select: { id: true } });
    if (!user) throw new NotFoundException(`User ${userId} not found`);

    const roleId = await this.resolveRoleId(dto.role ?? 'OPERATOR');
    const merchant = await this.prisma.merchant.findUnique({ where: { id: dto.organizationId }, select: { id: true } });
    if (!merchant) throw new NotFoundException(`Merchant ${dto.organizationId} not found`);

    await this.prisma.merchantMembership.upsert({
      where: { userId_merchantId: { userId, merchantId: dto.organizationId } },
      update: { roleId, isPrimary: dto.isPrimary ?? false, isActive: dto.isActive ?? true },
      create: { userId, merchantId: dto.organizationId, roleId, isPrimary: dto.isPrimary ?? false, isActive: dto.isActive ?? true },
    });

    return this.findOne(actor, userId);
  }

  async updateMembership(actor: AuthUser, userId: string, membershipId: string, dto: MembershipInputDto) {
    const membership = await this.prisma.merchantMembership.findFirst({ where: { id: membershipId, userId }, select: { id: true } });
    if (!membership) throw new NotFoundException(`Membership ${membershipId} not found`);

    const roleId = dto.role ? await this.resolveRoleId(dto.role) : undefined;
    await this.prisma.merchantMembership.update({
      where: { id: membershipId },
      data: { roleId, isPrimary: dto.isPrimary, isActive: dto.isActive },
    });

    return this.findOne(actor, userId);
  }

  async deactivateMembership(actor: AuthUser, userId: string, membershipId: string) {
    const membership = await this.prisma.merchantMembership.findFirst({ where: { id: membershipId, userId }, select: { id: true } });
    if (!membership) throw new NotFoundException(`Membership ${membershipId} not found`);

    await this.prisma.merchantMembership.update({ where: { id: membershipId }, data: { isActive: false, isPrimary: false } });
    return this.findOne(actor, userId);
  }

  private async resolveRoleId(roleNameOrId: string): Promise<string> {
    const byName = await this.prisma.systemRole.findUnique({ where: { name: roleNameOrId }, select: { id: true } });
    if (byName) return byName.id;
    const byId = await this.prisma.systemRole.findUnique({ where: { id: roleNameOrId }, select: { id: true } });
    if (!byId) throw new BadRequestException(`Role "${roleNameOrId}" not found`);
    return byId.id;
  }

  private async buildMembershipCreateData(memberships: MembershipInputDto[]) {
    return Promise.all(
      memberships.map(async (m) => ({
        merchantId: m.organizationId,
        roleId: await this.resolveRoleId(m.role ?? 'OPERATOR'),
        isPrimary: m.isPrimary ?? false,
        isActive: m.isActive ?? true,
      })),
    );
  }
}
