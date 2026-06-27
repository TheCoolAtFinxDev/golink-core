import { Injectable, NotFoundException, UnprocessableEntityException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

export interface RegisterMobileWalletDto {
  mobileNumber: string;
  walletRail: 'MPESA' | 'ECOCASH';
  customerId?: string;
  label?: string;
}

@Injectable()
export class StoredPaymentMethodsService {
  constructor(private readonly prisma: PrismaService) {}

  async registerMobileWallet(merchantId: string, dto: RegisterMobileWalletDto) {
    // Prevent duplicate active mobile wallets per merchant+number+rail
    const existing = await this.prisma.storedPaymentMethod.findFirst({
      where: {
        merchantId,
        mobileNumber: dto.mobileNumber,
        walletRail: dto.walletRail,
        isActive: true,
      },
    });
    if (existing) {
      throw new UnprocessableEntityException(
        `An active ${dto.walletRail} wallet for ${dto.mobileNumber} already exists (id: ${existing.id})`,
      );
    }

    return this.prisma.storedPaymentMethod.create({
      data: {
        merchantId,
        kind: 'MOBILE_WALLET',
        mobileNumber: dto.mobileNumber,
        walletRail: dto.walletRail,
        customerId: dto.customerId ?? null,
        isActive: true,
      },
    });
  }

  async list(merchantId: string) {
    return this.prisma.storedPaymentMethod.findMany({
      where: { merchantId, isActive: true },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        kind: true,
        mobileNumber: true,
        walletRail: true,
        maskedPan: true,
        expiryMMYY: true,
        scheme: true,
        customerId: true,
        isActive: true,
        createdAt: true,
      },
    });
  }

  async findOne(id: string, merchantId: string) {
    const spm = await this.prisma.storedPaymentMethod.findFirst({
      where: { id, merchantId },
    });
    if (!spm) throw new NotFoundException(`StoredPaymentMethod ${id} not found`);
    return spm;
  }

  async deactivate(id: string, merchantId: string) {
    const spm = await this.prisma.storedPaymentMethod.findFirst({
      where: { id, merchantId },
    });
    if (!spm) throw new NotFoundException(`StoredPaymentMethod ${id} not found`);
    return this.prisma.storedPaymentMethod.update({
      where: { id },
      data: { isActive: false },
      select: { id: true, kind: true, isActive: true, updatedAt: true },
    });
  }

  async setSettlementAccount(id: string, merchantId: string) {
    const spm = await this.prisma.storedPaymentMethod.findFirst({
      where: { id, merchantId, isActive: true },
    });
    if (!spm) throw new NotFoundException(`StoredPaymentMethod ${id} not found`);
    if (spm.kind === 'CARD') {
      throw new UnprocessableEntityException('Card tokens cannot be used as settlement accounts — use a mobile wallet or bank account');
    }

    // Clear any existing settlement account for this merchant first
    await this.prisma.storedPaymentMethod.updateMany({
      where: { merchantId, isSettlementAccount: true },
      data: { isSettlementAccount: false },
    });

    return this.prisma.storedPaymentMethod.update({
      where: { id },
      data: { isSettlementAccount: true },
      select: { id: true, kind: true, mobileNumber: true, walletRail: true, isSettlementAccount: true, updatedAt: true },
    });
  }
}
