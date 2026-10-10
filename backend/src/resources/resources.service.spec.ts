
import { Test, TestingModule } from '@nestjs/testing';
import {
  ForbiddenException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ResourcesService } from './resources.service';
import { Prisma } from '../../generated/prisma/client';

describe('ResourcesService', () => {
  let service: ResourcesService;

  const prismaMock = {
    resource: {
      findMany: jest.fn(),
      count: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    savedResource: {
      create: jest.fn(),
      findMany: jest.fn(),
      findUnique: jest.fn(),
      delete: jest.fn(),
    },
    $transaction: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    prismaMock.$transaction.mockImplementation(
      (queries: Promise<unknown>[]) => Promise.all(queries),
    );

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ResourcesService,
        { provide: PrismaService, useValue: prismaMock },
      ],
    }).compile();

    service = module.get<ResourcesService>(ResourcesService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  // RESOURCE DISCOVERY

  it('returns published resources and pagination metadata', async () => {
    const resources = [
      { id: 'resource-1', title: 'NestJS Documentation' },
      { id: 'resource-2', title: 'TypeScript Handbook' },
    ];

    prismaMock.resource.findMany.mockResolvedValue(resources);
    prismaMock.resource.count.mockResolvedValue(2);

    const result = await service.findAll({
      page: 1, limit: 10, sort: 'newest',
    });

    expect(result).toEqual({
      data: resources,
      meta: { total: 2, page: 1, limit: 10, totalPages: 1 },
    });

    expect(prismaMock.resource.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { status: 'PUBLISHED' },
        skip: 0,
        take: 10,
        orderBy: { createdAt: 'desc' },
      }),
    );
  });

  it('applies search, type, category and tag filters', async () => {
    prismaMock.resource.findMany.mockResolvedValue([]);
    prismaMock.resource.count.mockResolvedValue(0);

    await service.findAll({
      search: 'NestJS',
      type: 'DOCUMENTATION',
      categoryId: 'category-1',
      tagId: 'tag-1',
      page: 1,
      limit: 10,
      sort: 'newest',
    });

    expect(prismaMock.resource.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          status: 'PUBLISHED',
          OR: [
            { title: { contains: 'NestJS', mode: 'insensitive' } },
            { description: { contains: 'NestJS', mode: 'insensitive' } },
          ],
          type: 'DOCUMENTATION',
          categoryId: 'category-1',
          tags: { some: { tagId: 'tag-1' } },
        }),
      }),
    );
  });

  it('calculates pagination offsets correctly', async () => {
    prismaMock.resource.findMany.mockResolvedValue([]);
    prismaMock.resource.count.mockResolvedValue(25);

    const result = await service.findAll({
      page: 3, limit: 10, sort: 'newest',
    });

    expect(prismaMock.resource.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ skip: 20, take: 10 }),
    );

    expect(result.meta).toEqual({
      total: 25, page: 3, limit: 10, totalPages: 3,
    });
  });

  it('sorts resources by title when requested', async () => {
    prismaMock.resource.findMany.mockResolvedValue([]);
    prismaMock.resource.count.mockResolvedValue(0);

    await service.findAll({
      page: 1, limit: 10, sort: 'title',
    });

    expect(prismaMock.resource.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ orderBy: { title: 'asc' } }),
    );
  });

  it('returns zero total pages when no resources match', async () => {
    prismaMock.resource.findMany.mockResolvedValue([]);
    prismaMock.resource.count.mockResolvedValue(0);

    const result = await service.findAll({
      page: 1, limit: 10, sort: 'newest',
    });

    expect(result.data).toEqual([]);
    expect(result.meta.totalPages).toBe(0);
  });

  // RESOURCE CREATION

  it('creates a resource with a generated slug', async () => {
    prismaMock.resource.findUnique.mockResolvedValue(null);

    const createdResource = {
      id: 'resource-123',
      title: 'NestJS Testing Guide',
      slug: 'nestjs-testing-guide',
      url: 'https://example.com/nestjs-testing',
      submittedById: 'user-123',
    };

    prismaMock.resource.create.mockResolvedValue(createdResource);

    const result = await service.create(
      {
        title: 'NestJS Testing Guide',
        url: 'https://example.com/nestjs-testing',
      },
      'user-123',
    );

    expect(result).toEqual(createdResource);
    expect(prismaMock.resource.findUnique).toHaveBeenCalledWith({
      where: { slug: 'nestjs-testing-guide' },
    });

    expect(prismaMock.resource.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          slug: 'nestjs-testing-guide',
          submittedBy: { connect: { id: 'user-123' } },
        }),
      }),
    );
  });

  // RESOURCE UPDATES

  it('replaces existing tag associations when tagIds are provided', async () => {
    prismaMock.resource.findUnique.mockResolvedValue({
      id: 'resource-123',
      submittedById: 'user-123',
    });

    prismaMock.resource.update.mockResolvedValue({
      id: 'resource-123',
      tags: [],
    });

    await service.update(
      'resource-123',
      { tagIds: ['tag-1', 'tag-2'] },
      'user-123',
      'USER',
    );

    expect(prismaMock.resource.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'resource-123' },
        data: expect.objectContaining({
          tags: {
            deleteMany: {},
            create: [
              { tag: { connect: { id: 'tag-1' } } },
              { tag: { connect: { id: 'tag-2' } } },
            ],
          },
        }),
      }),
    );
  });

  it('clears all tag associations when tagIds is an empty array', async () => {
    prismaMock.resource.findUnique.mockResolvedValue({
      id: 'resource-123',
      submittedById: 'user-123',
    });

    prismaMock.resource.update.mockResolvedValue({
      id: 'resource-123',
      tags: [],
    });

    await service.update(
      'resource-123',
      { tagIds: [] },
      'user-123',
      'USER',
    );

    expect(prismaMock.resource.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          tags: {
            deleteMany: {},
          },
        }),
      }),
    );
  });

  it('leaves tag associations unchanged when tagIds is omitted', async () => {
    prismaMock.resource.findUnique.mockResolvedValue({
      id: 'resource-123',
      submittedById: 'user-123',
    });

    prismaMock.resource.update.mockResolvedValue({
      id: 'resource-123',
      title: 'Updated title',
    });

    await service.update(
      'resource-123',
      { title: 'Updated title' },
      'user-123',
      'USER',
    );

    const updateCall =
      prismaMock.resource.update.mock.calls[0][0];

    expect(updateCall.data.title).toBe('Updated title');
    expect(updateCall.data).not.toHaveProperty('tags');
  });

  // RESOURCE OWNERSHIP

  it('prevents a user from updating another user resource', async () => {
    prismaMock.resource.findUnique.mockResolvedValue({
      id: 'resource-123',
      submittedById: 'owner-123',
    });

    await expect(
      service.update(
        'resource-123',
        { title: 'Modified title' },
        'other-user-456',
        'USER',
      ),
    ).rejects.toThrow(ForbiddenException);

    expect(prismaMock.resource.update).not.toHaveBeenCalled();
  });

  it('prevents a user from deleting another user resource', async () => {
    prismaMock.resource.findUnique.mockResolvedValue({
      id: 'resource-123',
      submittedById: 'owner-123',
    });

    await expect(
      service.remove('resource-123', 'other-user-456', 'USER'),
    ).rejects.toThrow(ForbiddenException);

    expect(prismaMock.resource.delete).not.toHaveBeenCalled();
  });

  // SAVED RESOURCES

  it('saves a resource for a user', async () => {
    const saved = {
      userId: 'user-123',
      resourceId: 'resource-123',
    };

    prismaMock.savedResource.create.mockResolvedValue(saved);

    const result = await service.saveResource(
      'resource-123',
      'user-123',
    );

    expect(result).toEqual(saved);
    expect(prismaMock.savedResource.create).toHaveBeenCalledWith({
      data: {
        userId: 'user-123',
        resourceId: 'resource-123',
      },
    });
  });

  it('rejects duplicate saves', async () => {
    prismaMock.savedResource.create.mockRejectedValue(
      new Prisma.PrismaClientKnownRequestError(
        'Unique constraint failed',
        {
          code: 'P2002',
          clientVersion: '7.10.0',
        },
      ),
    );

    await expect(
      service.saveResource('resource-123', 'user-123'),
    ).rejects.toThrow(ConflictException);
  });

  it('retrieves saved resources for a user', async () => {
    const savedResources = [
      {
        userId: 'user-123',
        resourceId: 'resource-123',
        resource: { id: 'resource-123', title: 'NestJS Guide' },
      },
    ];

    prismaMock.savedResource.findMany.mockResolvedValue(savedResources);

    const result = await service.findSaved('user-123');

    expect(result).toEqual(savedResources);
    expect(prismaMock.savedResource.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { userId: 'user-123' },
        orderBy: { createdAt: 'desc' },
      }),
    );
  });

  it('unsaves a resource successfully', async () => {
    const saved = {
      userId: 'user-123',
      resourceId: 'resource-123',
    };

    prismaMock.savedResource.findUnique.mockResolvedValue(saved);
    prismaMock.savedResource.delete.mockResolvedValue(saved);

    const result = await service.unsaveResource(
      'resource-123',
      'user-123',
    );

    expect(result).toEqual(saved);
    expect(prismaMock.savedResource.findUnique).toHaveBeenCalledWith({
      where: {
        userId_resourceId: {
          userId: 'user-123',
          resourceId: 'resource-123',
        },
      },
    });
    expect(prismaMock.savedResource.delete).toHaveBeenCalledWith({
      where: {
        userId_resourceId: {
          userId: 'user-123',
          resourceId: 'resource-123',
        },
      },
    });
  });

  it('throws NotFoundException when unsaving a resource that is not saved', async () => {
    prismaMock.savedResource.findUnique.mockResolvedValue(null);

    await expect(
      service.unsaveResource('resource-123', 'user-123'),
    ).rejects.toThrow(NotFoundException);

    expect(prismaMock.savedResource.delete).not.toHaveBeenCalled();
  });
});
