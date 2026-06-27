import { Body, Controller, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import {
  CreateBillerDto,
  CreateOrganizationDto,
  OrganizationsService,
  UpdateOrganizationDto,
} from './organizations.service';
import { OrganizationType } from '../../generated/prisma';

@ApiTags('organizations')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('organizations')
export class OrganizationsController {
  constructor(private readonly orgs: OrganizationsService) {}

  @Post()
  @ApiOperation({ summary: 'Create an organisation' })
  create(@Body() dto: CreateOrganizationDto) {
    return this.orgs.create(dto);
  }

  @Get()
  @ApiOperation({ summary: 'List organisations' })
  findAll(@Query('type') type?: OrganizationType) {
    return this.orgs.findAll(type);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get an organisation' })
  findOne(@Param('id') id: string) {
    return this.orgs.findOne(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update an organisation' })
  update(@Param('id') id: string, @Body() dto: UpdateOrganizationDto) {
    return this.orgs.update(id, dto);
  }

  @Post(':id/billers')
  @ApiOperation({ summary: 'Add a biller to an organisation' })
  addBiller(@Param('id') id: string, @Body() dto: CreateBillerDto) {
    return this.orgs.addBiller(id, dto);
  }

  @Get(':id/billers')
  @ApiOperation({ summary: 'List billers for an organisation' })
  findBillers(@Param('id') id: string) {
    return this.orgs.findBillers(id);
  }
}
