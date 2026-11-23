import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';
import { NoCacheInterceptor } from './common/no-cache.interceptor';
import service from '../service.mjs';
import type { Application } from 'express';

function validateEnvironment() {
  const input = service.input();
  const jwtSecret = input.jwtSecret.expose();
  if (
    process.env.NODE_ENV === 'production' &&
    jwtSecret.length < 32
  ) {
    throw new Error('JWT_SECRET must be at least 32 characters in production.');
  }
  const frontendUrl = new URL(input.frontendUrl);
  if (
    frontendUrl.pathname !== '/' ||
    frontendUrl.search ||
    frontendUrl.hash ||
    frontendUrl.origin !== input.frontendUrl.replace(/\/$/, '')
  ) {
    throw new Error('FRONTEND_URL must contain only the frontend origin.');
  }
  if (
    process.env.NODE_ENV === 'production' &&
    frontendUrl.protocol !== 'https:'
  ) {
    throw new Error('FRONTEND_URL must use HTTPS in production.');
  }
  const githubOAuthValues = [
    process.env.GITHUB_CLIENT_ID,
    process.env.GITHUB_CLIENT_SECRET,
    process.env.GITHUB_CALLBACK_URL,
  ];
  if (githubOAuthValues.some(Boolean) && !githubOAuthValues.every(Boolean)) {
    throw new Error(
      'GITHUB_CLIENT_ID, GITHUB_CLIENT_SECRET, and GITHUB_CALLBACK_URL must be configured together.',
    );
  }
  if (process.env.GITHUB_CALLBACK_URL) {
    const callbackUrl = new URL(process.env.GITHUB_CALLBACK_URL);
    if (
      process.env.NODE_ENV === 'production' &&
      callbackUrl.protocol !== 'https:'
    ) {
      throw new Error('GITHUB_CALLBACK_URL must use HTTPS in production.');
    }
  }
  return input;
}

async function bootstrap() {
  const input = validateEnvironment();
  const app = await NestFactory.create(AppModule);

  if (process.env.NODE_ENV === 'production') {
    const expressApp = app.getHttpAdapter().getInstance() as Application;
    expressApp.set('trust proxy', 1);
  }

  app.enableCors({
    origin: input.frontendUrl,
  });
  app.useGlobalInterceptors(new NoCacheInterceptor());

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  await app.listen(service.port());
}

void bootstrap();
