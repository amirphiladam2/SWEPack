import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';
import { NoCacheInterceptor } from './common/no-cache.interceptor';
import { serviceInput } from './prisma/prisma.service';
import service from './prisma/service.mjs';
import type { Application } from 'express';

function validateEnvironment() {
  const input = serviceInput();
  const jwtSecret = input.jwtSecret.expose();
  const frontendUrl = input.frontendUrl.expose();
  if (
    process.env.NODE_ENV === 'production' &&
    jwtSecret.length < 32
  ) {
    throw new Error('JWT_SECRET must be at least 32 characters in production.');
  }
  let parsedFrontendUrl: URL;
  try {
    parsedFrontendUrl = new URL(frontendUrl);
  } catch {
    throw new Error('FRONTEND_URL must be a valid URL.');
  }
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
  const githubClientId = input.githubClientId?.expose();
  const githubClientSecret = input.githubClientSecret?.expose();
  const githubCallbackUrl = input.githubCallbackUrl?.expose();
  const githubOAuthValues = [
    githubClientId,
    githubClientSecret,
    githubCallbackUrl,
  ];
  if (githubOAuthValues.some(Boolean) && !githubOAuthValues.every(Boolean)) {
    throw new Error(
      'GITHUB_CLIENT_ID, GITHUB_CLIENT_SECRET, and GITHUB_CALLBACK_URL must be configured together.',
    );
  }
  if (githubCallbackUrl) {
    const callbackUrl = new URL(githubCallbackUrl);
    if (
      process.env.NODE_ENV === 'production' &&
      callbackUrl.protocol !== 'https:'
    ) {
      throw new Error('GITHUB_CALLBACK_URL must use HTTPS in production.');
    }
  }
}

async function bootstrap() {
  validateEnvironment();
  const app = await NestFactory.create(AppModule);

  if (process.env.NODE_ENV === 'production') {
    const expressApp = app.getHttpAdapter().getInstance() as Application;
    expressApp.set('trust proxy', 1);
  }

  app.enableCors({
    origin: serviceInput().frontendUrl.expose(),
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
