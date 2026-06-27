import { Logger, ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import * as express from 'express';
import { AppModule } from './app/app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, { rawBody: true });
  app.setGlobalPrefix('api');
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));

  // NestJS rawBody:true only captures json/urlencoded. The EnrollmentContinue form uses
  // multipart/form-data so we need explicit raw capture for the portal proxy route.
  app.use('/api/3ds/portal', express.raw({ type: '*/*', limit: '10mb' }));

  const config = new DocumentBuilder()
    .setTitle('Golink Transact API')
    .setDescription('Payment Orchestration Layer — merchants, PSP configs, payment instructions')
    .setVersion('1.0')
    .addApiKey({ type: 'apiKey', name: 'X-Api-Key', in: 'header' }, 'ApiKey')
    .build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document);

  const port = Number(process.env['PORT'] ?? 4001);
  await app.listen(port);
  Logger.log(`transact-api running on port ${port}`);
  Logger.log(`Swagger docs at http://localhost:${port}/api/docs`);
}

bootstrap();
