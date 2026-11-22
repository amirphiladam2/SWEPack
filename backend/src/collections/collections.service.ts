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
    const collections = await this.prisma.orm.Collection
      .where({ userId })
      .include('resources', (resources) => resources.count())
      .orderBy((c) => c.createdAt.desc())
      .all();
    return collections.map(({ resources, ...collection }) => ({
      ...collection,
      _count: { resources },
    }));
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
      await this.prisma.orm.Collection.where({ userId, slug }).first()
    ) {
      slug = `${baseSlug}-${suffix++}`;
    }

    return this.prisma.transaction(async (tx) => {
      const created = await tx.orm.public.Collection.create({
        name,
        description,
        slug,
        userId,
      });

      const { total } = await tx.orm.public.CollectionResource
        .where({ collectionId: created.id })
        .aggregate((a) => ({ total: a.count() }));

      return { ...created, _count: { resources: total } };
    });
  }

  async update(
    id: string,
    userId: string,
    updateCollectionDto: UpdateCollectionDto,
  ) {
    const collection = await this.prisma.orm.Collection.where({ id, userId }).first();

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
        await this.prisma.orm.Collection.where({ userId, slug }).where((c) => c.id.ne(id)).first()
      ) {
        slug = `${baseSlug}-${suffix++}`;
      }

      data.slug = slug;
    }

    if (description !== undefined) {
      data.description = description;
    }

    if (Object.keys(data).length === 0) {
      return this.withResourceCount(collection);
    }

    const updated = await this.prisma.orm.Collection.where({ id }).update(data);
    if (!updated) throw new NotFoundException('Collection not found.');
    return this.withResourceCount(updated);
  }

  private async withResourceCount(collection: {
    id: string;
    [key: string]: unknown;
  }) {
    const { total } = await this.prisma.orm.CollectionResource
      .where({ collectionId: collection.id })
      .aggregate((a) => ({ total: a.count() }));
    return { ...collection, _count: { resources: total } };
  }

  async remove(id: string, userId: string) {
    const collection = await this.prisma.orm.Collection.where({ id, userId }).first();

    if (!collection) {
      throw new NotFoundException('Collection not found.');
    }

    const removed = await this.prisma.orm.Collection.where({ id }).delete();
    if (!removed) throw new NotFoundException('Collection not found.');
    return removed;
  }

  async addResource(
    collectionId: string,
    userId: string,
    addResourceDto: AddResourceDto,
  ) {
    const collection = await this.prisma.orm.Collection.where({
      id: collectionId,
      userId,
    }).first();

    if (!collection) {
      throw new NotFoundException('Collection not found.');
    }

    const resource = await this.prisma.orm.Resource
      .select('id', 'title', 'url', 'type')
      .first({ id: addResourceDto.resourceId });

    if (!resource) {
      throw new NotFoundException('Resource not found.');
    }

    const existing = await this.prisma.orm.CollectionResource.where({
      collectionId,
      resourceId: addResourceDto.resourceId,
    }).first();

    if (existing) {
      throw new ConflictException(
        'Resource is already in this collection.',
      );
    }

    const created = await this.prisma.orm.CollectionResource.create({
      collectionId,
      resourceId: addResourceDto.resourceId,
    });

    return { ...created, resource };
  }

  async removeResource(collectionId: string, resourceId: string, userId: string) {
    const collection = await this.prisma.orm.Collection.where({ id: collectionId, userId }).first();

    if (!collection) {
      throw new NotFoundException('Collection not found.');
    }

    const collectionResource =
      await this.prisma.orm.CollectionResource.where({
        collectionId,
        resourceId,
      }).first();

    if (!collectionResource) {
      throw new NotFoundException(
        'Resource not found in this collection.',
      );
    }

    const removed = await this.prisma.orm.CollectionResource.where({
      collectionId,
      resourceId,
    }).delete();
    if (!removed) throw new NotFoundException('Resource not found in this collection.');
    return removed;
  }

  async findResources(collectionId: string, userId: string) {
    const collection = await this.prisma.orm.Collection.where({
      id: collectionId,
      userId,
    }).first();

    if (!collection) {
      throw new NotFoundException('Collection not found.');
    }

    return this.prisma.orm.CollectionResource
      .where({ collectionId })
      .include('resource', (resource) =>
        resource.include('category').include('tags', (tags) => tags.include('tag')),
      )
      .orderBy((cr) => cr.createdAt.desc())
      .all();
  }

}
