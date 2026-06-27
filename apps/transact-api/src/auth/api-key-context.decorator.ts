import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import type { Request } from 'express';
import type { ApiClientContext } from './api-key.guard';

export const ApiClient = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): ApiClientContext => {
    const request = ctx.switchToHttp().getRequest<Request>();
    return request.apiClient!;
  },
);
