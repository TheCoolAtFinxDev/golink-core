import { ConflictException, Injectable, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../prisma/prisma.service';
import { hashPassword, verifyPassword } from '../auth/password.util';
import { BuiltInRoles, FourEyesDefaults, PermissionDefinitions } from '../auth/permissions.constants';

@Injectable()
export class AdminAuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
  ) {}

  async login(email: string, password: string) {
    const user = await this.prisma.systemUser.findUnique({
      where: { email: email.toLowerCase().trim() },
    });
    if (!user || !user.isActive) throw new UnauthorizedException('Invalid credentials');

    const valid = verifyPassword(password, user.passwordHash);
    if (!valid) throw new UnauthorizedException('Invalid credentials');

    const payload = { sub: user.id, email: user.email, isSuperAdmin: user.isSuperAdmin };
    const token = this.jwt.sign(payload);

    return {
      token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        isSuperAdmin: user.isSuperAdmin,
        scope: 'SYSTEM_OWNER' as const,
        capabilities: ['*'],
        visibleModules: ['dashboard', 'merchants', 'payments', 'users', 'roles', 'approvals'],
      },
    };
  }

  async createAdmin(email: string, name: string, password: string) {
    const normalizedEmail = email.toLowerCase().trim();
    const existing = await this.prisma.systemUser.findUnique({ where: { email: normalizedEmail } });
    if (existing) throw new ConflictException(`User ${normalizedEmail} already exists`);

    await this.bootstrapRbac();

    const passwordHash = hashPassword(password);
    const user = await this.prisma.systemUser.create({
      data: { email: normalizedEmail, name, passwordHash, isSuperAdmin: true, isActive: true },
    });

    return { id: user.id, email: user.email, name: user.name };
  }

  async bootstrapRbac() {
    for (const def of PermissionDefinitions) {
      await this.prisma.permission.upsert({
        where: { code: def.code },
        update: { name: def.name, description: def.description, category: def.category },
        create: { code: def.code, name: def.name, description: def.description, category: def.category },
      });
    }

    for (const roleDef of BuiltInRoles) {
      const role = await this.prisma.systemRole.upsert({
        where: { name: roleDef.name },
        update: { description: roleDef.description, isBuiltIn: true },
        create: { name: roleDef.name, description: roleDef.description, isBuiltIn: true },
      });

      for (const code of roleDef.permissions) {
        const permission = await this.prisma.permission.findUnique({ where: { code } });
        if (!permission) continue;

        await this.prisma.rolePermission.upsert({
          where: { roleId_permissionId: { roleId: role.id, permissionId: permission.id } },
          update: { requires4Eyes: FourEyesDefaults[code] ?? false },
          create: {
            roleId: role.id,
            permissionId: permission.id,
            requires4Eyes: FourEyesDefaults[code] ?? false,
          },
        });
      }
    }
  }

  async getMe(userId: string) {
    const user = await this.prisma.systemUser.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException('User not found');
    return { id: user.id, email: user.email, name: user.name, isSuperAdmin: user.isSuperAdmin };
  }
}
