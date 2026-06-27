import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { PrismaService } from '../prisma/prisma.service';
import { AuthUser } from '../auth/auth.types';

@Injectable()
export class AdminJwtStrategy extends PassportStrategy(Strategy, 'admin-jwt') {
  constructor(
    config: ConfigService,
    private readonly prisma: PrismaService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: config.get<string>('ADMIN_JWT_SECRET', 'glk-admin-jwt-secret-change-in-prod'),
    });
  }

  async validate(payload: { sub: string; email: string; isSuperAdmin: boolean }): Promise<AuthUser> {
    const user = await this.prisma.systemUser.findUnique({
      where: { id: payload.sub, isActive: true },
      include: {
        memberships: {
          where: { isActive: true },
          include: {
            role: {
              include: {
                permissionGrants: {
                  include: { permission: { select: { code: true, isActive: true } } },
                },
              },
            },
          },
        },
      },
    });

    if (!user) throw new UnauthorizedException('User not found or inactive');

    const allGrants = user.memberships.flatMap((m) => m.role.permissionGrants);
    const activeGrants = allGrants.filter((g) => g.permission.isActive);

    const permissions = [...new Set(activeGrants.map((g) => g.permission.code))];
    const permissionsRequiring4Eyes = [...new Set(
      activeGrants.filter((g) => g.requires4Eyes).map((g) => g.permission.code),
    )];

    return {
      id: user.id,
      email: user.email,
      name: user.name,
      isSuperAdmin: user.isSuperAdmin,
      permissions,
      permissionsRequiring4Eyes,
      merchantIds: user.memberships.map((m) => m.merchantId),
    };
  }
}
