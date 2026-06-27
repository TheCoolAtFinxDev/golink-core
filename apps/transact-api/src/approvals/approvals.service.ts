import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { ApprovalStatus } from '../../generated/prisma';
import { PrismaService } from '../prisma/prisma.service';
import { AuthUser } from '../auth/auth.types';

export interface CreateApprovalDto {
  action: string;
  resourceType: string;
  resourceId?: string;
  payload: Record<string, unknown>;
  requesterNotes?: string;
  expiresInHours?: number;
}

@Injectable()
export class ApprovalsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(actor: AuthUser, dto: CreateApprovalDto) {
    const expiresAt = dto.expiresInHours
      ? new Date(Date.now() + dto.expiresInHours * 3600 * 1000)
      : new Date(Date.now() + 48 * 3600 * 1000);

    return this.prisma.approvalRequest.create({
      data: {
        requesterId: actor.id,
        action: dto.action,
        resourceType: dto.resourceType,
        resourceId: dto.resourceId,
        payload: dto.payload as any,
        requesterNotes: dto.requesterNotes,
        expiresAt,
      },
      include: this.include(),
    });
  }

  async findAll(actor: AuthUser, status?: string) {
    const where = status ? { status: status as ApprovalStatus } : undefined;
    return this.prisma.approvalRequest.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: this.include(),
    });
  }

  async findOne(id: string) {
    const req = await this.prisma.approvalRequest.findUnique({ where: { id }, include: this.include() });
    if (!req) throw new NotFoundException(`Approval request ${id} not found`);
    return req;
  }

  async approve(actor: AuthUser, id: string, notes?: string) {
    const req = await this.findOne(id);

    if (req.status !== ApprovalStatus.PENDING) {
      throw new ForbiddenException('Request is not pending');
    }
    if (req.requesterId === actor.id) {
      throw new ForbiddenException('Requester cannot approve their own request (4-eyes principle)');
    }

    const updated = await this.prisma.approvalRequest.update({
      where: { id },
      data: {
        status: ApprovalStatus.APPROVED,
        reviewerId: actor.id,
        reviewerNotes: notes,
        resolvedAt: new Date(),
      },
      include: this.include(),
    });

    await this.dispatch(updated.action, updated.payload as Record<string, unknown>);

    return updated;
  }

  private async dispatch(action: string, payload: Record<string, unknown>) {
    switch (action) {
      case 'merchants.suspend':
        await this.prisma.merchant.update({
          where: { id: payload['merchantId'] as string },
          data: { status: 'SUSPENDED' },
        });
        break;
      case 'merchants.unsuspend':
        await this.prisma.merchant.update({
          where: { id: payload['merchantId'] as string },
          data: { status: 'ACTIVE' },
        });
        break;
      case 'payments.cancel':
        await this.prisma.paymentInstruction.update({
          where: { id: payload['paymentId'] as string },
          data: { status: 'CANCELLED' },
        });
        break;
      case 'payments.refund':
        // PSP refund requires external processing — the approval record is the audit trail;
        // the operator must submit the refund to the PSP after approval.
        break;
      default:
        // Unknown action — no dispatch needed (e.g. psp_config.manage requires manual re-submission)
        break;
    }
  }

  async reject(actor: AuthUser, id: string, notes?: string) {
    const req = await this.findOne(id);

    if (req.status !== ApprovalStatus.PENDING) {
      throw new ForbiddenException('Request is not pending');
    }
    if (req.requesterId === actor.id) {
      throw new ForbiddenException('Requester cannot reject their own request');
    }

    return this.prisma.approvalRequest.update({
      where: { id },
      data: {
        status: ApprovalStatus.REJECTED,
        reviewerId: actor.id,
        reviewerNotes: notes,
        resolvedAt: new Date(),
      },
      include: this.include(),
    });
  }

  async cancel(actor: AuthUser, id: string) {
    const req = await this.findOne(id);

    if (req.requesterId !== actor.id && !actor.isSuperAdmin) {
      throw new ForbiddenException('Only the requester or super admin can cancel');
    }
    if (req.status !== ApprovalStatus.PENDING) {
      throw new ForbiddenException('Only pending requests can be cancelled');
    }

    return this.prisma.approvalRequest.update({
      where: { id },
      data: { status: ApprovalStatus.CANCELLED, resolvedAt: new Date() },
      include: this.include(),
    });
  }

  private include() {
    return {
      requester: { select: { id: true, name: true, email: true } },
      reviewer: { select: { id: true, name: true, email: true } },
    };
  }
}
