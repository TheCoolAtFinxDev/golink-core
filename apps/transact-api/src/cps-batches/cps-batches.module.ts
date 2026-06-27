import { Module } from '@nestjs/common';
import { MulterModule } from '@nestjs/platform-express';
import { PrismaModule } from '../prisma/prisma.module';
import { CpsBatchesService } from './cps-batches.service';
import { CpsBatchesController } from './cps-batches.controller';

@Module({
  imports: [PrismaModule, MulterModule.register({ limits: { fileSize: 10 * 1024 * 1024 } })],
  controllers: [CpsBatchesController],
  providers: [CpsBatchesService],
})
export class CpsBatchesModule {}
