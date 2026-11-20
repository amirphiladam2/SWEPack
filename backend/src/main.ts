import 'dotenv/config';
import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { NoCacheInterceptor } from './common/no-cache.interceptor';
import type { Application } from 'express';
import service from '../service.mjs';

function readPort(value: string | undefined) {
  const port = Number(value ?? 3001);
  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    throw new Error('PORT must be an integer between 1 and 65535.');
  }
  return port;
}

function validateEnvironment() {
  if (!process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL is required.');
  }
  if (!process.env.JWT_SECRET) {
    throw new Error('JWT_SECRET is required.');
  }
  if (
    process.env.NODE_ENV === 'production' &&
    process.env.JWT_SECRET.length < 32
  ) {
    throw new Error('JWT_SECRET must be at least 32 characters in production.');
  }
  if (!process.env.FRONTEND_URL) {
    throw new Error('FRONTEND_URL is required.');
  }
  const frontendUrl = new URL(process.env.FRONTEND_URL);
  if (
    frontendUrl.pathname !== '/' ||
    frontendUrl.search ||
    frontendUrl.hash ||
    frontendUrl.origin !== process.env.FRONTEND_URL.replace(/\/$/, '')
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
}

function plantEnvironment() {
  // Everything below arrives from the Composer service (its database
  // dependency and its input), never from a file in the repository.
  const { db } = service.load();
  const input = service.input();

  process.env.DATABASE_URL = db.url;
  process.env.JWT_SECRET = input.jwtSecret;
  process.env.FRONTEND_URL = input.frontendUrl;
  if (input.passwordResetEnabled !== undefined) {
    process.env.PASSWORD_RESET_ENABLED = input.passwordResetEnabled;
  }
  if (input.firebaseProjectId !== undefined) {
    process.env.FIREBASE_PROJECT_ID = input.firebaseProjectId;
  }
  if (input.firebaseClientEmail !== undefined) {
    process.env.FIREBASE_CLIENT_EMAIL = input.firebaseClientEmail;
  }
  if (input.firebasePrivateKey !== undefined) {
    process.env.FIREBASE_PRIVATE_KEY = input.firebasePrivateKey;
  }
  if (input.githubClientId !== undefined) {
    process.env.GITHUB_CLIENT_ID = input.githubClientId;
  }
  if (input.githubClientSecret !== undefined) {
    process.env.GITHUB_CLIENT_SECRET = input.githubClientSecret;
  }
  if (input.githubCallbackUrl !== undefined) {
    process.env.GITHUB_CALLBACK_URL = input.githubCallbackUrl;
  }
  if (input.resendApiKey !== undefined) {
    process.env.RESEND_API = input.resendApiKey;
  }
  if (input.emailFrom !== undefined) {
    process.env.EMAIL_FROM = input.emailFrom;
  }
}

plantEnvironment();

async function bootstrap() {
  validateEnvironment();
  // Imported after the service environment is planted: the NestJS modules
  // read the values above while they register.
  const { AppModule } = await import('./app.module.js');
  const app = await NestFactory.create(AppModule);

  if (process.env.NODE_ENV === 'production') {
    const expressApp = app.getHttpAdapter().getInstance() as Application;
    expressApp.set('trust proxy', 1);
  }

  app.enableCors({
    origin: process.env.FRONTEND_URL,
  });
  app.useGlobalInterceptors(new NoCacheInterceptor());

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  await app.listen(readPort(String(service.port())));
}

void bootstrap();
