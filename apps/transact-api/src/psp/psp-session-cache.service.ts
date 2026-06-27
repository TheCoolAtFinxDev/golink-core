import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import type { PspRail } from './payment-provider.interface';

interface TokenResult {
  token: string;
  expiresAt: Date;
}

@Injectable()
export class PspSessionCacheService {
  private readonly logger = new Logger(PspSessionCacheService.name);

  constructor(private readonly prisma: PrismaService) {}

  async getToken(
    merchantId: string,
    rail: PspRail,
    refreshFn: () => Promise<TokenResult>,
  ): Promise<string> {
    const now = new Date();
    const existing = await this.prisma.pspSessionCache.findUnique({
      where: { merchantId_rail: { merchantId, rail } },
    });

    if (existing && existing.expiresAt > now) {
      return existing.token;
    }

    this.logger.log(`Refreshing PSP session token merchantId=${merchantId} rail=${rail}`);
    const { token, expiresAt } = await refreshFn();

    await this.prisma.pspSessionCache.upsert({
      where: { merchantId_rail: { merchantId, rail } },
      create: { merchantId, rail, token, expiresAt },
      update: { token, expiresAt },
    });

    return token;
  }

  async invalidate(merchantId: string, rail: PspRail): Promise<void> {
    await this.prisma.pspSessionCache.deleteMany({ where: { merchantId, rail } });
  }
}
