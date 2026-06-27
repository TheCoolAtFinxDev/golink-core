import { Injectable, NotFoundException, UnprocessableEntityException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

function generateShortCode(length = 8): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789';
  return Array.from({ length }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
}

export interface CreatePaymentLinkDto {
  merchantId: string;
  title: string;
  description?: string;
  amountMinor?: number;
  currency: string;
  allowedRails?: string[];
  expiresAt?: string;
  maxUses?: number;
  recipientName?: string;
  recipientPhone?: string;
  recipientEmail?: string;
}

@Injectable()
export class PaymentLinksService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(merchantId?: string) {
    return this.prisma.paymentLink.findMany({
      where: merchantId ? { merchantId } : undefined,
      orderBy: { createdAt: 'desc' },
      take: 200,
    });
  }

  async findOne(id: string) {
    const link = await this.prisma.paymentLink.findUnique({ where: { id } });
    if (!link) throw new NotFoundException(`Payment link ${id} not found`);
    return link;
  }

  async findByShortCode(shortCode: string) {
    const link = await this.prisma.paymentLink.findUnique({ where: { shortCode } });
    if (!link) throw new NotFoundException(`Payment link not found`);
    return link;
  }

  async create(dto: CreatePaymentLinkDto) {
    let shortCode: string;
    let attempts = 0;
    do {
      shortCode = generateShortCode();
      const existing = await this.prisma.paymentLink.findUnique({ where: { shortCode } });
      if (!existing) break;
      attempts++;
    } while (attempts < 5);

    return this.prisma.paymentLink.create({
      data: {
        merchantId: dto.merchantId,
        shortCode: shortCode!,
        title: dto.title,
        description: dto.description,
        amountMinor: dto.amountMinor,
        currency: dto.currency,
        allowedRails: (dto.allowedRails ?? []) as any,
        expiresAt: dto.expiresAt ? new Date(dto.expiresAt) : undefined,
        maxUses: dto.maxUses,
        recipientName: dto.recipientName,
        recipientPhone: dto.recipientPhone,
        recipientEmail: dto.recipientEmail,
        status: 'ACTIVE',
      },
    });
  }

  async cancel(id: string) {
    const link = await this.prisma.paymentLink.findUnique({ where: { id } });
    if (!link) throw new NotFoundException(`Payment link ${id} not found`);
    if (link.status !== 'ACTIVE') {
      throw new UnprocessableEntityException(`Payment link is already ${link.status}`);
    }
    return this.prisma.paymentLink.update({ where: { id }, data: { status: 'CANCELLED' } });
  }

  async notify(id: string, channels: string[]) {
    const link = await this.prisma.paymentLink.findUnique({ where: { id } });
    if (!link) throw new NotFoundException(`Payment link ${id} not found`);
    if (link.status !== 'ACTIVE') {
      throw new UnprocessableEntityException(`Cannot notify on a ${link.status} payment link`);
    }

    // Store which channels were notified
    await this.prisma.paymentLink.update({
      where: { id },
      data: { notifiedVia: channels },
    });

    // Stub: actual SMS/email/WhatsApp sending would be wired here
    const results: Record<string, string> = {};
    for (const channel of channels) {
      results[channel] = 'queued';
    }

    return { notified: true, channels: results, shortCode: link.shortCode };
  }

  async incrementUseCount(id: string) {
    const link = await this.prisma.paymentLink.update({
      where: { id },
      data: { useCount: { increment: 1 } },
    });

    if (link.maxUses && link.useCount >= link.maxUses) {
      await this.prisma.paymentLink.update({ where: { id }, data: { status: 'EXHAUSTED' } });
    }

    return link;
  }
}
