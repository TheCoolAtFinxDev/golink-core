import { Body, Controller, Get, HttpCode, Post, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { IsEmail, IsString } from 'class-validator';
import { AdminAuthService } from './admin-auth.service';
import { AdminJwtGuard } from './admin-jwt.guard';
import { AuthUser } from '../auth/auth.types';

class LoginDto {
  @IsEmail() email!: string;
  @IsString() password!: string;
}

class CreateAdminDto {
  @IsEmail() email!: string;
  @IsString() name!: string;
  @IsString() password!: string;
}

@ApiTags('auth')
@Controller('auth')
export class AdminAuthController {
  constructor(private readonly adminAuth: AdminAuthService) {}

  @Post('login')
  @HttpCode(200)
  @ApiOperation({ summary: 'Login — returns JWT token + user profile' })
  login(@Body() dto: LoginDto) {
    return this.adminAuth.login(dto.email, dto.password);
  }

  @Get('me')
  @UseGuards(AdminJwtGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get current authenticated user' })
  me(@Req() req: { user: AuthUser }) {
    return this.adminAuth.getMe(req.user.id);
  }

  @Post('seed')
  @ApiOperation({ summary: 'One-time bootstrap: create super admin + seed RBAC' })
  seed(@Body() dto: CreateAdminDto) {
    return this.adminAuth.createAdmin(dto.email, dto.name, dto.password);
  }

  @Post('admin/seed')
  @ApiOperation({ summary: 'Alias: create super admin + seed RBAC' })
  seedAlias(@Body() dto: CreateAdminDto) {
    return this.adminAuth.createAdmin(dto.email, dto.name, dto.password);
  }

  @Post('bootstrap')
  @UseGuards(AdminJwtGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Re-run RBAC bootstrap (upserts permissions and built-in roles)' })
  bootstrap() {
    return this.adminAuth.bootstrapRbac().then(() => ({ ok: true }));
  }
}
