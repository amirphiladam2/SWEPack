
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { jest } from '@jest/globals';
import request from 'supertest';
import { App } from 'supertest/types';
import * as bcrypt from 'bcrypt';
import { AppModule } from './../src/app.module';
import { PrismaService } from './../src/prisma/prisma.service';
import { JwtService } from '@nestjs/jwt';

describe('SWEPack API (e2e)', () => {
  let app: INestApplication<App>;

  const mockUser = {
    id: 'test-user-1',
    name: 'Integration Test User',
    email: 'integration@example.com',
    password: '$2b$10$mocked-hash',
    role: 'USER',
    createdAt: new Date('2026-01-01T00:00:00.000Z'),
  };

  const prismaMock = {
    $queryRaw: jest.fn(),
    user: {
      findUnique: jest.fn(),
      create: jest.fn(),
    },
  };

  const jwtMock = {
    signAsync: jest.fn(),
    verifyAsync: jest.fn(),
  };

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(PrismaService)
      .useValue(prismaMock)
      .overrideProvider(JwtService)
      .useValue(jwtMock)
      .compile();

    app = moduleFixture.createNestApplication();

    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );

    await app.init();
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterAll(async () => {
    await app.close();
  });

  it('GET /health returns the API health status', async () => {
    prismaMock.$queryRaw.mockResolvedValue([{ '?column?': 1 }]);
    await request(app.getHttpServer())
      .get('/health')
      .expect(200)
      .expect(({ body }) => {
        expect(body).toMatchObject({
          status: 'ok',
          database: 'ok',
        });
      });
  });

  it('POST /auth/register creates a user', async () => {
    prismaMock.user.findUnique.mockResolvedValue(null);
    prismaMock.user.create.mockImplementation(({ data }) =>
      Promise.resolve({
        ...mockUser,
        name: data.name,
        email: data.email,
        password: data.password,
      }),
    );

    const response = await request(app.getHttpServer())
      .post('/auth/register')
      .send({
        name: 'Integration Test User',
        email: 'integration@example.com',
        password: 'TestPass123!',
      })
      .expect(201);

    expect(response.body).toMatchObject({
      id: mockUser.id,
      name: 'Integration Test User',
      email: 'integration@example.com',
      role: 'USER',
    });

    expect(response.body.password).toBeUndefined();
    expect(prismaMock.user.create).toHaveBeenCalledTimes(1);
  });

  it('POST /auth/register rejects duplicate emails', async () => {
    prismaMock.user.findUnique.mockResolvedValue(mockUser);

    await request(app.getHttpServer())
      .post('/auth/register')
      .send({
        name: 'Another User',
        email: mockUser.email,
        password: 'TestPass123!',
      })
      .expect(409);
  });

  it('POST /auth/login returns an access token for valid credentials', async () => {
    const passwordHash = await bcrypt.hash('TestPass123!', 4);

    prismaMock.user.findUnique.mockResolvedValue({
      ...mockUser,
      password: passwordHash,
    });
    jwtMock.signAsync.mockResolvedValue('test-access-token');

    const response = await request(app.getHttpServer())
      .post('/auth/login')
      .send({
        email: mockUser.email,
        password: 'TestPass123!',
      })
      .expect(201);

    expect(response.body.accessToken).toBe('test-access-token');
    expect(response.body.user).toMatchObject({
      id: mockUser.id,
      email: mockUser.email,
      role: 'USER',
    });
  });

  it('POST /auth/login rejects an incorrect password', async () => {
    prismaMock.user.findUnique.mockResolvedValue({
      ...mockUser,
      password: await bcrypt.hash('CorrectPass123!', 4),
    });

    await request(app.getHttpServer())
      .post('/auth/login')
      .send({
        email: mockUser.email,
        password: 'WrongPass123!',
      })
      .expect(401);
  });

  it('GET /auth/me rejects requests without a token', async () => {
    await request(app.getHttpServer())
      .get('/auth/me')
      .expect(401);
  });
});
