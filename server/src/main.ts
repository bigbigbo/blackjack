import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { ValidationPipe } from '@nestjs/common';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      disableErrorMessages: process.env.ENV === 'production',
    }),
  );

  const config = new DocumentBuilder()
    .setTitle('Blackjack')
    .setDescription('Blackjack API')
    .setVersion('1.0')
    .addTag('blackjack')
    .addSecurity('tma', {
      type: 'apiKey',
      name: 'authorization',
      in: 'header',
      description: 'The TMA token',
    })
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api', app, document, {
    swaggerOptions: {
      persistAuthorization: true,
    },
  });

  await app.listen(process.env.PORT ?? 3000);
}
bootstrap();
