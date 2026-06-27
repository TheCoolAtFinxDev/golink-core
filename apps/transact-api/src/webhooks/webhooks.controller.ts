import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ApiHeader, ApiOperation, ApiSecurity, ApiTags } from '@nestjs/swagger';
import { IsArray, IsString, IsUrl, ArrayNotEmpty } from 'class-validator';
import { ApiKeyGuard } from '../auth/api-key.guard';
import { ApiClient } from '../auth/api-key-context.decorator';
import type { ApiClientContext } from '../auth/api-key.guard';
import { WebhooksService, WEBHOOK_EVENTS } from './webhooks.service';

class RegisterWebhookDto {
  @IsUrl({ require_tld: false }, { message: 'url must be a valid URL' })
  url!: string;

  @IsArray()
  @ArrayNotEmpty()
  @IsString({ each: true })
  events!: string[];
}

@ApiTags('Webhooks')
@ApiSecurity('ApiKey')
@ApiHeader({
  name: 'X-Api-Key',
  description: 'Merchant API key',
  required: true,
})
@Controller('webhooks')
@UseGuards(ApiKeyGuard)
export class WebhooksController {
  constructor(private readonly webhooks: WebhooksService) {}

  @Post()
  @ApiOperation({
    summary: 'Register a webhook endpoint',
    description: `Register a URL to receive payment event notifications.

**Event types:** ${WEBHOOK_EVENTS.join(', ')}

Use \`"*"\` to subscribe to all events.

The response includes a \`secret\` field — store it securely. It is shown **only once** and is used to
verify the \`X-Golink-Signature\` header on each delivery.

**Verifying signatures:**
\`\`\`
const sig = 'sha256=' + hmac_sha256(request.body, secret);
assert(sig === request.headers['x-golink-signature']);
\`\`\``,
  })
  register(@Body() dto: RegisterWebhookDto, @ApiClient() client: ApiClientContext) {
    return this.webhooks.register(client.merchantId, dto.url, dto.events);
  }

  @Get()
  @ApiOperation({ summary: 'List webhook endpoints for this merchant' })
  list(@ApiClient() client: ApiClientContext) {
    return this.webhooks.list(client.merchantId);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Deactivate a webhook endpoint' })
  deactivate(@Param('id') id: string, @ApiClient() client: ApiClientContext) {
    return this.webhooks.deactivate(id, client.merchantId);
  }
}
