import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { UpdateCollectionDto } from './dto/update-collection.dto';
import { PrismaService } from '../prisma/prisma.service';
import { CreateCollectionDto } from './dto/create-collection.dto';
import { AddResourceDto } from './dto/add-resource.dto';

type CollectionRow = {
  resources: number;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  [key: string]: any;
};

function withResourceCount(row: {
  resources: number;
}): CollectionRow {
  const { resources, ...rest } = row;
  return { ...rest, _count: { resources } };
}

@Injectable()
export class CollectionsService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(userId: string) {
    const rows = await this.prisma.client.orm.public.Collection
      .include('resources', (resources) => resources.count())
      .where({ userId })
      .orderBy((collection) => collection.createdAt.desc())
      .all();
    return rows.map((row) => withResourceCount(row));
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
      await this.prisma.client.orm.public.Collection
        .where({ userId, slug })
        .first()
    ) {
      slug = `${baseSlug}-${suffix++}`;
    }

    const created = await this.prisma.client.orm.public.Collection
      .include('resources', (resources) => resources.count())
      .create({
        name,
        description,
        slug,
        user: (user) => user.connect({ id: userId }),
      });
    return withResourceCount(created);
  }

  async update(
    id: string,
    userId: string,
    updateCollectionDto: UpdateCollectionDto,
  ) {
    const collection = await this.prisma.client.orm.public.Collection
      .where({ id, userId })
      .first();

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
        await this.prisma.client.orm.public.Collection
          .where({ userId, slug })
          .where((row) => row.id.neq(id))
          .first()
      ) {
        slug = `${baseSlug}-${suffix++}`;
      }

      data.slug = slug;
    }

    if (description !== undefined) {
      data.description = description;
    }

    const updated = await this.prisma.client.orm.public.Collection
      .include('resources', (resources) => resources.count())
      .where({ id })
      .update(data);
    return withResourceCount(updated!);
  }

  async remove(id: string, userId: string) {
    const collection = await this.prisma.client.orm.public.Collection
      .where({ id, userId })
      .first();

    if (!collection) {
      throw new NotFoundException('Collection not found.');
    }

    return this.prisma.client.orm.public.Collection
      .where({ id })
      .delete();
  }

  async addResource(
    collectionId: string,
    userId: string,
    addResourceDto: AddResourceDto,
  ) {
    const collection = await this.prisma.client.orm.public.Collection
      .where({ id: collectionId, userId })
      .first();

    if (!collection) {
      throw new NotFoundException('Collection not found.');
    }

    const resource = await this.prisma.client.orm.public.Resource
      .where({ id: addResourceDto.resourceId })
      .first();

    if (!resource) {
      throw new NotFoundException('Resource not found.');
    }

    const existing = await this.prisma.client.orm.public.CollectionResource
      .where({ collectionId, resourceId: addResourceDto.resourceId })
      .first();

    if (existing) {
      throw new ConflictException(
        'Resource is already in this collection.',
      );
    }

    const created = await this.prisma.client.orm.public.CollectionResource
      .include('resource', (resource) =>
        resource.select('id', 'title', 'url', 'type'),
      )
      .create({
        collection: (collection) => collection.connect({ id: collectionId }),
        resource: (resource) =>
          resource.connect({ id: addResourceDto.resourceId }),
      });
    return created;
  }

  async removeResource(collectionId: string, resourceId: string, userId: string) {
    const collection = await this.prisma.client.orm.public.Collection
      .where({ id: collectionId, userId })
      .first();

    if (!collection) {
      throw new NotFoundException('Collection not found.');
    }

    const collectionResource =
      await this.prisma.client.orm.public.CollectionResource
        .where({ collectionId, resourceId })
        .first();

    if (!collectionResource) {
      throw new NotFoundException(
        'Resource not found in this collection.',
      );
    }

    return this.prisma.client.orm.public.CollectionResource
      .where({ collectionId, resourceId })
      .delete();
  }

  async findResources(collectionId: string, userId: string) {
    const collection = await this.prisma.client.orm.public.Collection
      .where({ id: collectionId, userId })
      .first();

    if (!collection) {
      throw new NotFoundException('Collection not found.');
    }

    return this.prisma.client.orm.public.CollectionResource
      .where({ collectionId })
      .include('resource', (resource) =>
        resource
          .include('category')
          .include('tags', (tags) => tags.include('tag')),
      )
      .orderBy((row) => row.createdAt.desc())
      .all();
  }

}
