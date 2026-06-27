import { Injectable, NotFoundException, UnprocessableEntityException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class CpsBatchesService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(merchantId?: string) {
    return this.prisma.cpsBatch.findMany({
      where: merchantId ? { merchantId } : undefined,
      orderBy: { createdAt: 'desc' },
      take: 200,
      include: { merchant: { select: { id: true, name: true, slug: true } } },
    });
  }

  async findOne(id: string) {
    const batch = await this.prisma.cpsBatch.findUnique({
      where: { id },
      include: { merchant: { select: { id: true, name: true, slug: true } } },
    });
    if (!batch) throw new NotFoundException(`CPS batch ${id} not found`);
    return batch;
  }

  async create(merchantId: string, fileContent: string, originalName: string) {
    const last = await this.prisma.cpsBatch.findFirst({
      where: { merchantId },
      orderBy: { sequenceNumber: 'desc' },
      select: { sequenceNumber: true },
    });
    const sequenceNumber = (last?.sequenceNumber ?? 0) + 1;

    return this.prisma.cpsBatch.create({
      data: {
        merchantId,
        sequenceNumber,
        fileContent,
        status: 'DRAFT',
      },
    });
  }

  async submit(id: string) {
    const batch = await this.prisma.cpsBatch.findUnique({ where: { id } });
    if (!batch) throw new NotFoundException(`CPS batch ${id} not found`);
    if (batch.status !== 'DRAFT') {
      throw new UnprocessableEntityException(`Batch is already in status ${batch.status}`);
    }
    return this.prisma.cpsBatch.update({
      where: { id },
      data: { status: 'SUBMITTED', submittedAt: new Date() },
    });
  }
}
