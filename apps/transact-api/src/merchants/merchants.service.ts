import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { randomBytes } from 'node:crypto';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../prisma/prisma.service';
import type { CreateMerchantDto, UpdateMerchantDto } from './dto/create-merchant.dto';
import type { CreatePspConfigDto } from './dto/create-psp-config.dto';
import type { CreateApiClientDto } from './dto/create-api-client.dto';

@Injectable()
export class MerchantsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateMerchantDto) {
    const existing = await this.prisma.merchant.findUnique({ where: { slug: dto.slug } });
    if (existing) throw new ConflictException(`Merchant with slug "${dto.slug}" already exists`);
    return this.prisma.merchant.create({ data: { name: dto.name, slug: dto.slug } });
  }

  async findAll() {
    return this.prisma.merchant.findMany({ orderBy: { createdAt: 'desc' } });
  }

  async findOne(id: string) {
    const merchant = await this.prisma.merchant.findUnique({
      where: { id },
      include: { pspConfigs: true, apiClients: { select: { id: true, name: true, sourceSystem: true, isActive: true, lastUsedAt: true, createdAt: true } } },
    });
    if (!merchant) throw new NotFoundException(`Merchant ${id} not found`);
    return merchant;
  }

  async update(id: string, dto: UpdateMerchantDto) {
    await this.findOne(id);
    return this.prisma.merchant.update({ where: { id }, data: dto });
  }

  async addPspConfig(merchantId: string, dto: CreatePspConfigDto) {
    await this.findOne(merchantId);
    const existing = await this.prisma.merchantPspConfig.findUnique({
      where: { merchantId_rail: { merchantId, rail: dto.rail } },
    });
    if (existing) {
      return this.prisma.merchantPspConfig.update({
        where: { merchantId_rail: { merchantId, rail: dto.rail } },
        data: { config: dto.config, isActive: dto.isActive ?? true },
      });
    }
    return this.prisma.merchantPspConfig.create({
      data: { merchantId, rail: dto.rail, config: dto.config, isActive: dto.isActive ?? true },
    });
  }

  async generateApiKey(merchantId: string, dto: CreateApiClientDto): Promise<{ client: object; rawKey: string }> {
    await this.findOne(merchantId);
    const randomPart = randomBytes(20).toString('base64url').slice(0, 32);
    const rawKey = `glk_live_${randomPart}`;
    const keyPrefix = randomPart.slice(0, 8);
    const keyHash = await bcrypt.hash(rawKey, 10);

    const client = await this.prisma.apiClient.create({
      data: {
        merchantId,
        name: dto.name,
        sourceSystem: dto.sourceSystem,
        keyHash,
        keyPrefix,
      },
      select: { id: true, name: true, sourceSystem: true, keyPrefix: true, isActive: true, createdAt: true },
    });

    return { client, rawKey };
  }

  async revokeApiKey(merchantId: string, clientId: string) {
    const client = await this.prisma.apiClient.findFirst({ where: { id: clientId, merchantId } });
    if (!client) throw new NotFoundException(`ApiClient ${clientId} not found`);
    return this.prisma.apiClient.update({ where: { id: clientId }, data: { isActive: false } });
  }

  async suspend(id: string) {
    await this.findOne(id);
    return this.prisma.merchant.update({ where: { id }, data: { status: 'SUSPENDED' } });
  }

  async unsuspend(id: string) {
    await this.findOne(id);
    return this.prisma.merchant.update({ where: { id }, data: { status: 'ACTIVE' } });
  }
}
