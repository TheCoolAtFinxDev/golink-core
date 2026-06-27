import {
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Query,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiBearerAuth, ApiConsumes, ApiOperation, ApiTags } from '@nestjs/swagger';
import { AdminJwtGuard } from '../admin-auth/admin-jwt.guard';
import { PermissionGuard } from '../auth/guards/permission.guard';
import { RequirePermission } from '../auth/decorators/require-permission.decorator';
import { PermissionCodes } from '../auth/permissions.constants';
import { CpsBatchesService } from './cps-batches.service';

@ApiTags('CPS Batches (Admin)')
@ApiBearerAuth()
@UseGuards(AdminJwtGuard, PermissionGuard)
@Controller('admin/cps-batches')
export class CpsBatchesController {
  constructor(private readonly service: CpsBatchesService) {}

  @Get()
  @RequirePermission(PermissionCodes.CPS_BATCHES_READ)
  @ApiOperation({ summary: 'List CPS batches' })
  findAll(@Query('merchantId') merchantId?: string) {
    return this.service.findAll(merchantId);
  }

  @Get(':id')
  @RequirePermission(PermissionCodes.CPS_BATCHES_READ)
  @ApiOperation({ summary: 'Get CPS batch details' })
  findOne(@Param('id') id: string) {
    return this.service.findOne(id);
  }

  @Post('upload')
  @RequirePermission(PermissionCodes.CPS_BATCHES_MANAGE)
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'Upload a CPS CSV batch file' })
  @UseInterceptors(FileInterceptor('file'))
  async upload(
    @UploadedFile() file: Express.Multer.File,
    @Query('merchantId') merchantId: string,
  ) {
    const content = file.buffer.toString('utf-8');
    return this.service.create(merchantId, content, file.originalname);
  }

  @Post(':id/submit')
  @RequirePermission(PermissionCodes.CPS_BATCHES_MANAGE)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Submit a DRAFT CPS batch to the clearing house' })
  submit(@Param('id') id: string) {
    return this.service.submit(id);
  }
}
