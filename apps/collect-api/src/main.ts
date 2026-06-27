import { Logger, ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app/app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.setGlobalPrefix('api');
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));

  const config = new DocumentBuilder()
    .setTitle('Golink Collect API')
    .setDescription('Collection Layer — organisations, billers, bills, customers, KYC')
    .setVersion('1.0')
    .addBearerAuth()
    .build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document);

  const port = Number(process.env['PORT'] ?? 4002);
  await app.listen(port);
  Logger.log(`collect-api running on port ${port}`);
  Logger.log(`Swagger docs at http://localhost:${port}/api/docs`);
}

bootstrap();
