import 'dotenv/config';
import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';
import { NoCacheInterceptor } from './common/no-cache.interceptor';
import type { Application } from 'express';

// On Compute the app is configured through its service declaration, not the
// environment. Values absent there keep their local-development behavior.
type AppConfig = {
  jwtSecret?: string;
  frontendUrl?: string;
  passwordResetEnabled?: string;
  firebaseProjectId?: string;
  firebaseClientEmail?: string;
  firebasePrivateKey?: string;
  resendApi?: string;
  emailFrom?: string;
  githubClientId?: string;
  githubClientSecret?: string;
  githubCallbackUrl?: string;
};

let composerConfig: AppConfig | undefined;
let composerDbUrl: string | undefined;

function readComposerConfig(): AppConfig {
  if (composerConfig === undefined) {
    try {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const service = require('./service.mjs').default;
      const input = service.input();
      composerConfig = {
        jwtSecret: input.jwtSecret?.expose?.() ?? input.jwtSecret,
        frontendUrl: input.frontendUrl?.expose?.() ?? input.frontendUrl,
        passwordResetEnabled:
          input.passwordResetEnabled?.expose?.() ?? input.passwordResetEnabled,
        firebaseProjectId:
          input.firebaseProjectId?.expose?.() ?? input.firebaseProjectId,
        firebaseClientEmail:
          input.firebaseClientEmail?.expose?.() ?? input.firebaseClientEmail,
        firebasePrivateKey:
          input.firebasePrivateKey?.expose?.() ?? input.firebasePrivateKey,
        resendApi: input.resendApi?.expose?.() ?? input.resendApi,
        emailFrom: input.emailFrom?.expose?.() ?? input.emailFrom,
        githubClientId: input.githubClientId?.expose?.() ?? input.githubClientId,
        githubClientSecret:
          input.githubClientSecret?.expose?.() ?? input.githubClientSecret,
        githubCallbackUrl:
          input.githubCallbackUrl?.expose?.() ?? input.githubCallbackUrl,
      };
      const { db } = service.load();
      composerDbUrl = db.url;
      process.env.DATABASE_URL ||= composerDbUrl;
    } catch {
      composerConfig = {};
    }
  }
  return composerConfig;
}

function configValue(name: 'jwtSecret' | 'frontendUrl' | string): string | undefined {
  const fromService = readComposerConfig()[name];
  return fromService ?? process.env[name];
}

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
  if (!configValue('jwtSecret')) {
    throw new Error('JWT_SECRET is required.');
  }
  if (
    process.env.NODE_ENV === 'production' &&
    (configValue('jwtSecret') ?? '').length < 32
  ) {
    throw new Error('JWT_SECRET must be at least 32 characters in production.');
  }
  if (!configValue('frontendUrl')) {
    throw new Error('FRONTEND_URL is required.');
  }
  const frontendUrl = new URL(configValue('frontendUrl')!);
  if (
    frontendUrl.pathname !== '/' ||
    frontendUrl.search ||
    frontendUrl.hash ||
    frontendUrl.origin !== configValue('frontendUrl')!.replace(/\/$/, '')
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
    configValue('githubClientId'),
    configValue('githubClientSecret'),
    configValue('githubCallbackUrl'),
  ];
  if (githubOAuthValues.some(Boolean) && !githubOAuthValues.every(Boolean)) {
    throw new Error(
      'GITHUB_CLIENT_ID, GITHUB_CLIENT_SECRET, and GITHUB_CALLBACK_URL must be configured together.',
    );
  }
  if (configValue('githubCallbackUrl')) {
    const callbackUrl = new URL(configValue('githubCallbackUrl')!);
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
    origin: configValue('frontendUrl'),
  });
  app.useGlobalInterceptors(new NoCacheInterceptor());

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  await app.listen(readPort(process.env.PORT ?? String(servicePort())));
}

function servicePort(): number | undefined {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const service = require('./service.mjs').default;
    return service.port();
  } catch {
    return undefined;
  }
}

void bootstrap();
