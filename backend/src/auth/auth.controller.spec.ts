import { Test, TestingModule } from '@nestjs/testing';

jest.mock('./jwt-auth.guard', () => ({
  JwtAuthGuard: class JwtAuthGuard {},
}));
jest.mock('@nestjs/jwt', () => ({
  JwtService: class JwtService {},
}));
jest.mock('@nestjs/throttler', () => ({
  ThrottlerGuard: class ThrottlerGuard {},
  Throttle: () => () => undefined,
}));

import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { GithubOAuthService } from './github-oauth.service';

describe('AuthController', () => {
  let controller: AuthController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [
        { provide: AuthService, useValue: {} },
        { provide: GithubOAuthService, useValue: {} },
      ],
    }).compile();

    controller = module.get<AuthController>(AuthController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('exposes account deletion request endpoints', () => {
    expect(
      Object.getOwnPropertyNames(Object.getPrototypeOf(controller)),
    ).toEqual(
      expect.arrayContaining([
        'getAccountDeletionRequest',
        'requestAccountDeletion',
      ]),
    );
  });
});
