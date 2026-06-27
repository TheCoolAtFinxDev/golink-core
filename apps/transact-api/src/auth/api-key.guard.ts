import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import type { Request } from 'express';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../prisma/prisma.service';

export interface ApiClientContext {
  apiClientId: string;
  merchantId: string;
  sourceSystem: string;
}

declare module 'express' {
  interface Request {
    apiClient?: ApiClientContext;
  }
}

@Injectable()
export class ApiKeyGuard implements CanActivate {
  constructor(private readonly prisma: PrismaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request>();
    const apiKey = request.headers['x-api-key'];

    if (!apiKey || typeof apiKey !== 'string') {
      throw new UnauthorizedException('Missing X-Api-Key header');
    }

    // Key format: glk_live_PPPPPPPP<random>
    //                       ^---8 char prefix starts at index 9
    if (!apiKey.startsWith('glk_live_') || apiKey.length < 17) {
      throw new UnauthorizedException('Invalid API key format');
    }

    const keyPrefix = apiKey.slice(9, 17);

    const client = await this.prisma.apiClient.findFirst({
      where: { keyPrefix, isActive: true },
    });

    if (!client || !(await bcrypt.compare(apiKey, client.keyHash))) {
      throw new UnauthorizedException('Invalid API key');
    }

    await this.prisma.apiClient.update({
      where: { id: client.id },
      data: { lastUsedAt: new Date() },
    });

    request.apiClient = {
      apiClientId: client.id,
      merchantId: client.merchantId,
      sourceSystem: client.sourceSystem,
    };

    return true;
  }
}
