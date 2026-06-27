import {
  BadRequestException, ConflictException, Injectable, NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class RolesService {
  constructor(private readonly prisma: PrismaService) {}

  private toResponse(role: any) {
    return {
      id: role.id,
      name: role.name,
      description: role.description,
      isBuiltIn: role.isBuiltIn,
      isActive: role.isActive,
      createdAt: role.createdAt,
      updatedAt: role.updatedAt,
      permissions: (role.permissionGrants ?? []).map((g: any) => ({
        id: g.id,
        permissionId: g.permissionId,
        requires4Eyes: g.requires4Eyes,
        permission: g.permission,
      })),
    };
  }

  async findAll() {
    const roles = await this.prisma.systemRole.findMany({
      orderBy: [{ isBuiltIn: 'desc' }, { name: 'asc' }],
      include: {
        permissionGrants: { include: { permission: true } },
        _count: { select: { memberships: true } },
      },
    });
    return roles.map((r) => ({ ...this.toResponse(r), memberCount: (r as any)._count.memberships }));
  }

  async findOne(id: string) {
    const role = await this.prisma.systemRole.findUnique({
      where: { id },
      include: { permissionGrants: { include: { permission: true } } },
    });
    if (!role) throw new NotFoundException(`Role ${id} not found`);
    return this.toResponse(role);
  }

  async create(dto: { name: string; description?: string }) {
    const existing = await this.prisma.systemRole.findUnique({ where: { name: dto.name }, select: { id: true } });
    if (existing) throw new ConflictException(`Role "${dto.name}" already exists`);

    const role = await this.prisma.systemRole.create({
      data: { name: dto.name, description: dto.description },
      include: { permissionGrants: { include: { permission: true } } },
    });
    return this.toResponse(role);
  }

  async update(id: string, dto: { name?: string; description?: string; isActive?: boolean }) {
    const role = await this.prisma.systemRole.findUnique({ where: { id }, select: { id: true, isBuiltIn: true } });
    if (!role) throw new NotFoundException(`Role ${id} not found`);
    if (role.isBuiltIn && dto.name) throw new BadRequestException('Cannot rename built-in roles');

    if (dto.name) {
      const taken = await this.prisma.systemRole.findUnique({ where: { name: dto.name }, select: { id: true } });
      if (taken && taken.id !== id) throw new ConflictException(`Role name "${dto.name}" already in use`);
    }

    const updated = await this.prisma.systemRole.update({
      where: { id },
      data: { name: dto.name, description: dto.description, isActive: dto.isActive },
      include: { permissionGrants: { include: { permission: true } } },
    });
    return this.toResponse(updated);
  }

  async setPermission(roleId: string, permissionId: string, requires4Eyes: boolean) {
    try {
      await this.prisma.rolePermission.upsert({
        where: { roleId_permissionId: { roleId, permissionId } },
        update: { requires4Eyes },
        create: { roleId, permissionId, requires4Eyes },
      });
    } catch {
      throw new NotFoundException(`Role or permission not found`);
    }
    return this.findOne(roleId);
  }

  async removePermission(roleId: string, permissionId: string) {
    try {
      await this.prisma.rolePermission.delete({ where: { roleId_permissionId: { roleId, permissionId } } });
    } catch {
      throw new NotFoundException('Permission grant not found');
    }
    return this.findOne(roleId);
  }

  async listPermissions() {
    return this.prisma.permission.findMany({
      where: { isActive: true },
      orderBy: [{ category: 'asc' }, { name: 'asc' }],
    });
  }
}
