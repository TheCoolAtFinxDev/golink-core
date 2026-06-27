import {
  Body, Controller, Delete, Get, Param, Patch, Post, UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { IsBoolean, IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { AdminJwtGuard } from '../admin-auth/admin-jwt.guard';
import { PermissionGuard } from '../auth/guards/permission.guard';
import { RequirePermission } from '../auth/decorators/require-permission.decorator';
import { PermissionCodes } from '../auth/permissions.constants';
import { RolesService } from './roles.service';

class CreateRoleDto {
  @IsString() @IsNotEmpty() name!: string;
  @IsOptional() @IsString() description?: string;
}

class UpdateRoleDto {
  @IsOptional() @IsString() name?: string;
  @IsOptional() @IsString() description?: string;
  @IsOptional() @IsBoolean() isActive?: boolean;
}

class SetPermissionDto {
  @IsBoolean() requires4Eyes!: boolean;
}

@ApiTags('Roles')
@ApiBearerAuth()
@UseGuards(AdminJwtGuard, PermissionGuard)
@Controller('roles')
export class RolesController {
  constructor(private readonly roles: RolesService) {}

  @Get()
  @RequirePermission(PermissionCodes.ROLES_READ)
  @ApiOperation({ summary: 'List all roles with their permissions' })
  findAll() {
    return this.roles.findAll();
  }

  @Get('permissions')
  @RequirePermission(PermissionCodes.ROLES_READ)
  @ApiOperation({ summary: 'List all available permissions' })
  listPermissions() {
    return this.roles.listPermissions();
  }

  @Get(':id')
  @RequirePermission(PermissionCodes.ROLES_READ)
  @ApiOperation({ summary: 'Get a role by id' })
  findOne(@Param('id') id: string) {
    return this.roles.findOne(id);
  }

  @Post()
  @RequirePermission(PermissionCodes.ROLES_MANAGE)
  @ApiOperation({ summary: 'Create a custom role' })
  create(@Body() dto: CreateRoleDto) {
    return this.roles.create(dto);
  }

  @Patch(':id')
  @RequirePermission(PermissionCodes.ROLES_MANAGE)
  @ApiOperation({ summary: 'Update a role' })
  update(@Param('id') id: string, @Body() dto: UpdateRoleDto) {
    return this.roles.update(id, dto);
  }

  @Post(':id/permissions/:permissionId')
  @RequirePermission(PermissionCodes.ROLES_MANAGE)
  @ApiOperation({ summary: 'Assign a permission to a role (set requires4Eyes flag)' })
  setPermission(
    @Param('id') id: string,
    @Param('permissionId') permissionId: string,
    @Body() dto: SetPermissionDto,
  ) {
    return this.roles.setPermission(id, permissionId, dto.requires4Eyes);
  }

  @Delete(':id/permissions/:permissionId')
  @RequirePermission(PermissionCodes.ROLES_MANAGE)
  @ApiOperation({ summary: 'Remove a permission from a role' })
  removePermission(@Param('id') id: string, @Param('permissionId') permissionId: string) {
    return this.roles.removePermission(id, permissionId);
  }
}
