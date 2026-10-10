import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { UpdateCollectionDto } from './dto/update-collection.dto';
import { PrismaService } from '../prisma/prisma.service';
import { CreateCollectionDto } from './dto/create-collection.dto';
import { AddResourceDto } from './dto/add-resource.dto';

@Injectable()
export class CollectionsService {
  constructor(private readonly prisma: PrismaService) { }

  async findAll(userId: string) {
    return this.prisma.collection.findMany({
      where: { userId },
      include: {
        _count: {
          select: { resources: true },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  async create(createCollectionDto: CreateCollectionDto, userId: string) {
    const { name, description } = createCollectionDto;

    const baseSlug = name
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '');

    let slug = baseSlug;
    let suffix = 2;

    while (
      await this.prisma.collection.findUnique({
        where: {
          userId_slug: { userId, slug },
        },
      })
    ) {
      slug = `${baseSlug}-${suffix++}`;
    }

    return this.prisma.collection.create({
      data: {
        name,
        description,
        slug,
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
  }

  async update(
    id: string,
    userId: string,
    updateCollectionDto: UpdateCollectionDto,
  ) {
    const collection = await this.prisma.collection.findFirst({
      where: { id, userId },
    });

    if (!collection) {
      throw new NotFoundException('Collection not found.');
    }

    const { name, description } = updateCollectionDto;
    const data: {
      name?: string;
      description?: string | null;
      slug?: string;
    } = {};

    if (name !== undefined) {
      data.name = name;

      const baseSlug = name
        .toLowerCase()
        .trim()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '');

      let slug = baseSlug;
      let suffix = 2;

      while (
        await this.prisma.collection.findFirst({
          where: {
            userId,
            slug,
            NOT: { id },
          },
        })
      ) {
        slug = `${baseSlug}-${suffix++}`;
      }

      data.slug = slug;
    }

    if (description !== undefined) {
      data.description = description;
    }

    return this.prisma.collection.update({
      where: { id },
      data,
      include: {
        _count: {
          select: { resources: true },
        },
      },
    });
  }

  async remove(id: string, userId: string) {
    const collection = await this.prisma.collection.findFirst({
      where: { id, userId },
    });

    if (!collection) {
      throw new NotFoundException('Collection not found.');
    }

    return this.prisma.collection.delete({
      where: { id },
    });
  }

  async addResource(
    collectionId: string,
    userId: string,
    addResourceDto: AddResourceDto,
  ) {
    const collection = await this.prisma.collection.findFirst({
      where: {
        id: collectionId,
        userId,
      },
    });

    if (!collection) {
      throw new NotFoundException('Collection not found.');
    }

    const resource = await this.prisma.resource.findUnique({
      where: {
        id: addResourceDto.resourceId,
      },
    });

    if (!resource) {
      throw new NotFoundException('Resource not found.');
    }

    const existing = await this.prisma.collectionResource.findUnique({
      where: {
        collectionId_resourceId: {
          collectionId,
          resourceId: addResourceDto.resourceId,
        },
      },
    });

    if (existing) {
      throw new ConflictException(
        'Resource is already in this collection.',
      );
    }

    return this.prisma.collectionResource.create({
      data: {
        collection: {
          connect: { id: collectionId },
        },
        resource: {
          connect: { id: addResourceDto.resourceId },
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
  }

  async removeResource(collectionId: string, resourceId: string, userId: string) {
    const collection = await this.prisma.collection.findFirst({
      where: { id: collectionId, userId },
    });

    if (!collection) {
      throw new NotFoundException('Collection not found.');
    }

    const collectionResource =
      await this.prisma.collectionResource.findUnique({
        where: {
          collectionId_resourceId: {
            collectionId,
            resourceId,
          },
        },
      });

    if (!collectionResource) {
      throw new NotFoundException(
        'Resource not found in this collection.',
      );
    }

    return this.prisma.collectionResource.delete({
      where: {
        collectionId_resourceId: {
          collectionId,
          resourceId,
        },
      },
    });
  }

  async findResources(collectionId: string, userId: string) {
    const collection = await this.prisma.collection.findFirst({
      where: {
        id: collectionId,
        userId,
      },
    });

    if (!collection) {
      throw new NotFoundException('Collection not found.');
    }

    return this.prisma.collectionResource.findMany({
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
      orderBy: {
        createdAt: 'desc',
      },
    });
  }

}
