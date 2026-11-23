import 'dotenv/config';
import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';
import { NoCacheInterceptor } from './common/no-cache.interceptor';
import { frontendUrlValue, initRuntime, jwtSecretValue } from './prisma/runtime';
import type { Application } from 'express';

function readPort(value: string | undefined) {
  const port = Number(value ?? 3001);
  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    throw new Error('PORT must be an integer between 1 and 65535.');
  }
  return port;
}

function validateEnvironment() {
  if (!jwtSecretValue()) {
    throw new Error('JWT_SECRET is required.');
  }
  if (
    process.env.NODE_ENV === 'production' &&
    (jwtSecretValue() as string).length < 32
  ) {
    throw new Error('JWT_SECRET must be at least 32 characters in production.');
  }
  const frontendUrl = frontendUrlValue();
  if (!frontendUrl) {
    throw new Error('FRONTEND_URL is required.');
  }
  const parsedFrontendUrl = new URL(frontendUrl);
  if (
    parsedFrontendUrl.pathname !== '/' ||
    parsedFrontendUrl.search ||
    parsedFrontendUrl.hash ||
    parsedFrontendUrl.origin !== frontendUrl.replace(/\/$/, '')
  ) {
    throw new Error('FRONTEND_URL must contain only the frontend origin.');
  }
  if (
    process.env.NODE_ENV === 'production' &&
    parsedFrontendUrl.protocol !== 'https:'
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
}

async function bootstrap() {
  await initRuntime();
  validateEnvironment();
  const app = await NestFactory.create(AppModule);

  if (process.env.NODE_ENV === 'production') {
    const expressApp = app.getHttpAdapter().getInstance() as Application;
    expressApp.set('trust proxy', 1);
  }

  app.enableCors({
    origin: frontendUrlValue(),
  });
  app.useGlobalInterceptors(new NoCacheInterceptor());

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  await app.listen(readPort(process.env.PORT));
}

void bootstrap();
