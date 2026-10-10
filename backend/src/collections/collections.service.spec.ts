
import { Test, TestingModule } from '@nestjs/testing';
import {
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CollectionsService } from './collections.service';

describe('CollectionsService', () => {
  let service: CollectionsService;

  const prismaMock = {
    collection: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    resource: {
      findUnique: jest.fn(),
    },
    collectionResource: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
      delete: jest.fn(),
    },
  };

  const userId = 'user-123';
  const collectionId = 'collection-123';
  const resourceId = 'resource-123';

  const collection = {
    id: collectionId,
    name: 'Embedded Firmware',
    slug: 'embedded-firmware',
    description: 'Firmware resources',
    userId,
  };

  const resource = {
    id: resourceId,
    title: 'STM32 Documentation',
    url: 'https://example.com/stm32',
    type: 'DOCUMENTATION',
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CollectionsService,
        {
          provide: PrismaService,
          useValue: prismaMock,
        },
      ],
    }).compile();

    service = module.get<CollectionsService>(CollectionsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('findAll', () => {
    it('returns collections belonging to the user', async () => {
      prismaMock.collection.findMany.mockResolvedValue([collection]);

      const result = await service.findAll(userId);

      expect(result).toEqual([collection]);
      expect(prismaMock.collection.findMany).toHaveBeenCalledWith({
        where: { userId },
        include: {
          _count: {
            select: { resources: true },
          },
        },
        orderBy: { createdAt: 'desc' },
      });
    });

    it('returns an empty array when the user has no collections', async () => {
      prismaMock.collection.findMany.mockResolvedValue([]);

      await expect(service.findAll(userId)).resolves.toEqual([]);
    });
  });

  describe('create', () => {
    it('creates a collection with a generated slug', async () => {
      prismaMock.collection.findUnique.mockResolvedValue(null);
      prismaMock.collection.create.mockResolvedValue(collection);

      const dto = {
        name: 'Embedded Firmware',
        description: 'Firmware resources',
      };

      const result = await service.create(dto, userId);

      expect(result).toEqual(collection);
      expect(prismaMock.collection.create).toHaveBeenCalledWith({
        data: {
          name: dto.name,
          description: dto.description,
          slug: 'embedded-firmware',
          user: {
            connect: { id: userId },
          },
        },
        include: {
          _count: {
            select: { resources: true },
          },
        },
      });
    });

    it('generates a unique slug when the original slug already exists', async () => {
      prismaMock.collection.findUnique
        .mockResolvedValueOnce(collection)
        .mockResolvedValueOnce(null);

      prismaMock.collection.create.mockResolvedValue({
        ...collection,
        slug: 'embedded-firmware-2',
      });

      await service.create(
        { name: 'Embedded Firmware' },
        userId,
      );

      expect(prismaMock.collection.findUnique).toHaveBeenNthCalledWith(
        1,
        {
          where: {
            userId_slug: {
              userId,
              slug: 'embedded-firmware',
            },
          },
        },
      );

      expect(prismaMock.collection.findUnique).toHaveBeenNthCalledWith(
        2,
        {
          where: {
            userId_slug: {
              userId,
              slug: 'embedded-firmware-2',
            },
          },
        },
      );

      expect(prismaMock.collection.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            slug: 'embedded-firmware-2',
          }),
        }),
      );
    });

    it('normalizes the collection name when generating its slug', async () => {
      prismaMock.collection.findUnique.mockResolvedValue(null);
      prismaMock.collection.create.mockResolvedValue({
        ...collection,
        name: '  STM32 & Embedded Systems!  ',
        slug: 'stm32-embedded-systems',
      });

      await service.create(
        { name: '  STM32 & Embedded Systems!  ' },
        userId,
      );

      expect(prismaMock.collection.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            slug: 'stm32-embedded-systems',
          }),
        }),
      );
    });
  });

  describe('update', () => {
    it('updates a collection owned by the user', async () => {
      prismaMock.collection.findFirst.mockResolvedValue(collection);
      prismaMock.collection.update.mockResolvedValue({
        ...collection,
        description: 'Updated description',
      });

      const result = await service.update(
        collectionId,
        userId,
        { description: 'Updated description' },
      );

      expect(result.description).toBe('Updated description');
      expect(prismaMock.collection.update).toHaveBeenCalledWith({
        where: { id: collectionId },
        data: { description: 'Updated description' },
        include: {
          _count: {
            select: { resources: true },
          },
        },
      });
    });

    it('updates the name and regenerates the slug', async () => {
      prismaMock.collection.findFirst
        .mockResolvedValueOnce(collection)
        .mockResolvedValueOnce(null);

      prismaMock.collection.update.mockResolvedValue({
        ...collection,
        name: 'STM32 Guides',
        slug: 'stm32-guides',
      });

      await service.update(
        collectionId,
        userId,
        { name: 'STM32 Guides' },
      );

      expect(prismaMock.collection.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: collectionId },
          data: {
            name: 'STM32 Guides',
            slug: 'stm32-guides',
          },
        }),
      );
    });

    it('generates a unique slug when renaming to an existing slug', async () => {
      prismaMock.collection.findFirst
        .mockResolvedValueOnce(collection)
        .mockResolvedValueOnce({ id: 'another-collection' })
        .mockResolvedValueOnce(null);

      prismaMock.collection.update.mockResolvedValue({
        ...collection,
        name: 'STM32 Guides',
        slug: 'stm32-guides-2',
      });

      await service.update(
        collectionId,
        userId,
        { name: 'STM32 Guides' },
      );

      expect(prismaMock.collection.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: {
            name: 'STM32 Guides',
            slug: 'stm32-guides-2',
          },
        }),
      );
    });

    it('throws NotFoundException when the collection is not owned by the user', async () => {
      prismaMock.collection.findFirst.mockResolvedValue(null);

      await expect(
        service.update(collectionId, userId, {
          name: 'New Name',
        }),
      ).rejects.toThrow(NotFoundException);

      expect(prismaMock.collection.update).not.toHaveBeenCalled();
    });
  });

  describe('remove', () => {
    it('deletes a collection owned by the user', async () => {
      prismaMock.collection.findFirst.mockResolvedValue(collection);
      prismaMock.collection.delete.mockResolvedValue(collection);

      await expect(
        service.remove(collectionId, userId),
      ).resolves.toEqual(collection);

      expect(prismaMock.collection.delete).toHaveBeenCalledWith({
        where: { id: collectionId },
      });
    });

    it('throws NotFoundException when the collection is not owned by the user', async () => {
      prismaMock.collection.findFirst.mockResolvedValue(null);

      await expect(
        service.remove(collectionId, userId),
      ).rejects.toThrow(NotFoundException);

      expect(prismaMock.collection.delete).not.toHaveBeenCalled();
    });
  });

  describe('addResource', () => {
    it('adds a resource to a collection', async () => {
      prismaMock.collection.findFirst.mockResolvedValue(collection);
      prismaMock.resource.findUnique.mockResolvedValue(resource);
      prismaMock.collectionResource.findUnique.mockResolvedValue(null);

      const savedResource = {
        collectionId,
        resourceId,
        resource,
      };

      prismaMock.collectionResource.create.mockResolvedValue(savedResource);

      const result = await service.addResource(
        collectionId,
        userId,
        { resourceId },
      );

      expect(result).toEqual(savedResource);
      expect(prismaMock.collectionResource.create).toHaveBeenCalledWith({
        data: {
          collection: {
            connect: { id: collectionId },
          },
          resource: {
            connect: { id: resourceId },
          },
        },
        include: {
          resource: {
            select: {
              id: true,
              title: true,
              url: true,
              type: true,
            },
          },
        },
      });
    });

    it('throws NotFoundException when the collection is not owned by the user', async () => {
      prismaMock.collection.findFirst.mockResolvedValue(null);

      await expect(
        service.addResource(collectionId, userId, { resourceId }),
      ).rejects.toThrow(NotFoundException);

      expect(prismaMock.resource.findUnique).not.toHaveBeenCalled();
      expect(prismaMock.collectionResource.create).not.toHaveBeenCalled();
    });

    it('throws NotFoundException when the resource does not exist', async () => {
      prismaMock.collection.findFirst.mockResolvedValue(collection);
      prismaMock.resource.findUnique.mockResolvedValue(null);

      await expect(
        service.addResource(collectionId, userId, { resourceId }),
      ).rejects.toThrow(NotFoundException);

      expect(prismaMock.collectionResource.create).not.toHaveBeenCalled();
    });

    it('throws ConflictException when the resource is already in the collection', async () => {
      prismaMock.collection.findFirst.mockResolvedValue(collection);
      prismaMock.resource.findUnique.mockResolvedValue(resource);
      prismaMock.collectionResource.findUnique.mockResolvedValue({
        collectionId,
        resourceId,
      });

      await expect(
        service.addResource(collectionId, userId, { resourceId }),
      ).rejects.toThrow(ConflictException);

      expect(prismaMock.collectionResource.create).not.toHaveBeenCalled();
    });
  });

  describe('removeResource', () => {
    it('removes a resource from a collection', async () => {
      prismaMock.collection.findFirst.mockResolvedValue(collection);
      prismaMock.collectionResource.findUnique.mockResolvedValue({
        collectionId,
        resourceId,
      });
      prismaMock.collectionResource.delete.mockResolvedValue({
        collectionId,
        resourceId,
      });

      await expect(
        service.removeResource(collectionId, resourceId, userId),
      ).resolves.toEqual({ collectionId, resourceId });

      expect(prismaMock.collectionResource.delete).toHaveBeenCalledWith({
        where: {
          collectionId_resourceId: {
            collectionId,
            resourceId,
          },
        },
      });
    });

    it('throws NotFoundException when the collection is not owned by the user', async () => {
      prismaMock.collection.findFirst.mockResolvedValue(null);

      await expect(
        service.removeResource(collectionId, resourceId, userId),
      ).rejects.toThrow(NotFoundException);

      expect(prismaMock.collectionResource.delete).not.toHaveBeenCalled();
    });

    it('throws NotFoundException when the resource is not in the collection', async () => {
      prismaMock.collection.findFirst.mockResolvedValue(collection);
      prismaMock.collectionResource.findUnique.mockResolvedValue(null);

      await expect(
        service.removeResource(collectionId, resourceId, userId),
      ).rejects.toThrow(NotFoundException);

      expect(prismaMock.collectionResource.delete).not.toHaveBeenCalled();
    });
  });

  describe('findResources', () => {
    it('returns resources belonging to a collection owned by the user', async () => {
      const collectionResource = {
        collectionId,
        resourceId,
        resource,
      };

      prismaMock.collection.findFirst.mockResolvedValue(collection);
      prismaMock.collectionResource.findMany.mockResolvedValue([
        collectionResource,
      ]);

      const result = await service.findResources(collectionId, userId);

      expect(result).toEqual([collectionResource]);
      expect(prismaMock.collectionResource.findMany).toHaveBeenCalledWith({
        where: { collectionId },
        include: {
          resource: {
            include: {
              category: true,
              tags: {
                include: {
                  tag: true,
                },
              },
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      });
    });

    it('returns an empty array when the collection has no resources', async () => {
      prismaMock.collection.findFirst.mockResolvedValue(collection);
      prismaMock.collectionResource.findMany.mockResolvedValue([]);

      await expect(
        service.findResources(collectionId, userId),
      ).resolves.toEqual([]);
    });

    it('throws NotFoundException when the collection is not owned by the user', async () => {
      prismaMock.collection.findFirst.mockResolvedValue(null);

      await expect(
        service.findResources(collectionId, userId),
      ).rejects.toThrow(NotFoundException);

      expect(prismaMock.collectionResource.findMany).not.toHaveBeenCalled();
    });
  });
});
