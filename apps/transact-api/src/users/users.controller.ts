import {
  Body, Controller, Delete, Get, Param, Patch, Post, Query, Req, UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { AdminJwtGuard } from '../admin-auth/admin-jwt.guard';
import { PermissionGuard } from '../auth/guards/permission.guard';
import { RequirePermission } from '../auth/decorators/require-permission.decorator';
import { PermissionCodes } from '../auth/permissions.constants';
import { AuthUser } from '../auth/auth.types';
import { UsersService } from './users.service';
import { CreateUserDto, ListUsersDto, MembershipInputDto, UpdateUserDto } from './dto/users.dto';

@ApiTags('Users')
@ApiBearerAuth()
@UseGuards(AdminJwtGuard, PermissionGuard)
@Controller('users')
export class UsersController {
  constructor(private readonly users: UsersService) {}

  @Get()
  @RequirePermission(PermissionCodes.USERS_READ)
  @ApiOperation({ summary: 'List system users' })
  findAll(@Req() req: { user: AuthUser }, @Query() query: ListUsersDto) {
    return this.users.findAll(req.user, query);
  }

  @Get(':id')
  @RequirePermission(PermissionCodes.USERS_READ)
  @ApiOperation({ summary: 'Get system user by id' })
  findOne(@Req() req: { user: AuthUser }, @Param('id') id: string) {
    return this.users.findOne(req.user, id);
  }

  @Post()
  @RequirePermission(PermissionCodes.USERS_MANAGE)
  @ApiOperation({ summary: 'Create a system user' })
  create(@Req() req: { user: AuthUser }, @Body() dto: CreateUserDto) {
    return this.users.create(req.user, dto);
  }

  @Patch(':id')
  @RequirePermission(PermissionCodes.USERS_MANAGE)
  @ApiOperation({ summary: 'Update a system user' })
  update(@Req() req: { user: AuthUser }, @Param('id') id: string, @Body() dto: UpdateUserDto) {
    return this.users.update(req.user, id, dto);
  }

  @Delete(':id')
  @RequirePermission(PermissionCodes.USERS_MANAGE)
  @ApiOperation({ summary: 'Deactivate a system user' })
  deactivate(@Req() req: { user: AuthUser }, @Param('id') id: string) {
    return this.users.deactivate(req.user, id);
  }

  @Post(':id/memberships')
  @RequirePermission(PermissionCodes.USERS_MANAGE)
  @ApiOperation({ summary: 'Add a merchant membership to a user' })
  addMembership(@Req() req: { user: AuthUser }, @Param('id') id: string, @Body() dto: MembershipInputDto) {
    return this.users.addMembership(req.user, id, dto);
  }

  @Patch(':id/memberships/:membershipId')
  @RequirePermission(PermissionCodes.USERS_MANAGE)
  @ApiOperation({ summary: 'Update a membership' })
  updateMembership(
    @Req() req: { user: AuthUser },
    @Param('id') id: string,
    @Param('membershipId') membershipId: string,
    @Body() dto: MembershipInputDto,
  ) {
    return this.users.updateMembership(req.user, id, membershipId, dto);
  }

  @Delete(':id/memberships/:membershipId')
  @RequirePermission(PermissionCodes.USERS_MANAGE)
  @ApiOperation({ summary: 'Deactivate a membership' })
  deactivateMembership(
    @Req() req: { user: AuthUser },
    @Param('id') id: string,
    @Param('membershipId') membershipId: string,
  ) {
    return this.users.deactivateMembership(req.user, id, membershipId);
  }
}
