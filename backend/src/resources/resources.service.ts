import {
  ConflictException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { or } from '@prisma/orm-postgres/orm-client';
import { PrismaService } from '../prisma/prisma.service';
import { isUniqueConstraintError } from '../prisma/errors';
import { CreateResourceDto } from './dto/create-resource.dto';
import { UpdateResourceDto } from './dto/update-resource.dto';
import { ResourceQueryDto } from './dto/resource-query.dto';
import { AdminResourceQueryDto } from './dto/admin-resource-query.dto';
import type { ResourceStatus } from '../common/prisma-enums';

function escapeLike(value: string) {
  return value.replace(/[\\%_]/g, (character) => `\\${character}`);
}

@Injectable()
export class ResourcesService {
  private readonly logger = new Logger(ResourcesService.name);

  constructor(private readonly prisma: PrismaService) { }

  private getUniqueConstraintFields(
    error: unknown,
  ): string[] {
    const target =
      typeof error === 'object' && error !== null && 'constraint' in error
        ? (error as { constraint?: unknown }).constraint
        : undefined;

    if (typeof target === 'string') {
      return [target];
    }

    if (
      Array.isArray(target) &&
      target.every((field): field is string => typeof field === 'string')
    ) {
      return target;
    }

    return [];
  }

  private getCreateConflictMessage(fields: string[]): string {
    const normalizedFields = fields.map((field) => field.toLowerCase());
    const hasUrlConflict = normalizedFields.some(
      (field) => field === 'url' || field.includes('resource_url_key'),
    );
    const hasSlugConflict = normalizedFields.some(
      (field) => field === 'slug' || field.includes('resource_slug_key'),
    );

    if (hasUrlConflict) {
      return 'A resource with this URL already exists.';
    }

    if (hasSlugConflict) {
      return 'A resource with this title already exists.';
    }

    return 'A resource could not be created because a unique value already exists.';
  }

  private generateSlug(title: string): string {
    return title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '');
  }

  private async generateUniqueSlug(title: string): Promise<string> {
    const baseSlug = this.generateSlug(title);

    let slug = baseSlug;
    let counter = 2;

    while (
      await this.prisma.client.orm.public.Resource
        .where({ slug })
        .first()
    ) {
      slug = `${baseSlug}-${counter}`;
      counter++;
    }

    return slug;
  }

  async findAll(query: ResourceQueryDto) {
    const {
      search,
      type,
      categoryId,
      tagId,
      page = 1,
      limit = 10,
      sort = 'newest',
    } = query;

    const { data, total } = await this.prisma.client.transaction(async (tx) => {
      let filtered = tx.orm.public.Resource.where({
        status: 'PUBLISHED',
      });

      if (search) {
        filtered = filtered.where((resource) =>
          or(
            resource.title.ilike(`%${escapeLike(search)}%`),
            resource.description.ilike(`%${escapeLike(search)}%`),
          ),
        );
      }
      if (type) {
        filtered = filtered.where({ type });
      }
      if (categoryId) {
        filtered = filtered.where({ categoryId });
      }
      if (tagId) {
        filtered = filtered.where((resource) =>
          resource.tags.some((tag) => tag.tagId.eq(tagId)),
        );
      }

      const orderBy =
        sort === 'oldest'
          ? [(resource) => resource.createdAt.asc(), (resource) => resource.id.asc()]
          : sort === 'title'
            ? [(resource) => resource.title.asc(), (resource) => resource.id.asc()]
            : [(resource) => resource.createdAt.desc(), (resource) => resource.id.asc()];

      const resources = await filtered
        .select(
          'id',
          'title',
          'url',
          'description',
          'type',
          'logoUrl',
          'previewImageUrl',
        )
        .include('category', (category) => category.select('id', 'name'))
        .include('tags', (tags) => tags.include('tag', (tag) => tag.select('name')))
        .orderBy(orderBy)
        .offset((page - 1) * limit)
        .limit(limit)
        .all();
      const totalRow = await filtered
        .aggregate((aggregate) => ({ count: aggregate.count() }));
      return { resources, total: totalRow.count };
    });

    return {
      data,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findAllForAdmin(query: AdminResourceQueryDto) {
    const { search, status, page = 1, limit = 20 } = query;

    const { data, total } = await this.prisma.client.transaction(async (tx) => {
      let filtered = tx.orm.public.Resource;
      if (status) {
        filtered = filtered.where({ status });
      }
      if (search) {
        filtered = filtered.where((resource) =>
          or(
            resource.title.ilike(`%${escapeLike(search)}%`),
            resource.url.ilike(`%${escapeLike(search)}%`),
          ),
        );
      }

      const resources = await filtered
        .include('category')
        .include('tags', (tags) => tags.include('tag'))
        .include('submittedBy', (submittedBy) =>
          submittedBy.select('id', 'name', 'email', 'role'),
        )
        .orderBy((resource) => resource.createdAt.desc())
        .offset((page - 1) * limit)
        .limit(limit)
        .all();
      const totalRow = await filtered
        .aggregate((aggregate) => ({ count: aggregate.count() }));
      return { resources, total: totalRow.count };
    });

    return {
      data,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async getAdminSummary() {
    const countOf = (status?: ResourceStatus) => {
      const collection = this.prisma.client.orm.public.Resource;
      const filtered = status ? collection.where({ status }) : collection;
      return filtered
        .aggregate((aggregate) => ({ count: aggregate.count() }))
        .then((row) => row.count);
    };

    const [total, pending, published, rejected, archived] = await Promise.all([
      countOf(),
      countOf('PENDING'),
      countOf('PUBLISHED'),
      countOf('REJECTED'),
      countOf('ARCHIVED'),
    ]);

    return { total, pending, published, rejected, archived };
  }


  async create(createResourceDto: CreateResourceDto, userId: string) {
    const { categoryId, tagIds, ...resourceData } = createResourceDto;

    try {
      const existingResource = await this.prisma.client.orm.public.Resource
        .where({ url: createResourceDto.url })
        .include('category')
        .include('tags', (tags) => tags.include('tag'))
        .first();
      if (existingResource) {
        if (existingResource.submittedById === userId) {
          return existingResource;
        }
        throw new ConflictException(
          'A resource with this URL has already been submitted.',
        );
      }

      const slug = await this.generateUniqueSlug(createResourceDto.title);
      const resource = await this.prisma.client.orm.public.Resource
        .include('category')
        .include('tags', (tags) => tags.include('tag'))
        .create({
          ...resourceData,

          slug,

          submittedBy: (user) => user.connect({ id: userId }),
          ...(categoryId
            ? {
                category: (category) => category.connect({ id: categoryId }),
              }
            : {}),

          ...(tagIds
            ? {
                tags: (tags) =>
                  tags.create(
                    tagIds.map((tagId) => ({
                      tag: (tag) => tag.connect({ id: tagId }),
                    })),
                  ),
              }
            : {}),
        });
      this.logger.log('Resource submission created with PENDING status.');
      return resource;
    } catch (error) {
      if (isUniqueConstraintError(error)) {
        const existingResource = await this.prisma.client.orm.public.Resource
          .where({ url: createResourceDto.url })
          .include('category')
          .include('tags', (tags) => tags.include('tag'))
          .first();
        if (existingResource) {
          if (existingResource.submittedById === userId) {
            return existingResource;
          }
          throw new ConflictException(
            'A resource with this URL has already been submitted.',
          );
        }

        const fields = this.getUniqueConstraintFields(error);
        const target = fields.length > 0 ? fields.join(', ') : 'unknown';
        this.logger.warn(
          `Resource submission conflict: ${target}; ` +
            `hasTitle=${Boolean(createResourceDto.title)}; ` +
            `hasUrl=${Boolean(createResourceDto.url)}; ` +
            `hasCategory=${Boolean(categoryId)}; ` +
            `tagCount=${tagIds?.length ?? 0}.`,
        );
        throw new ConflictException(this.getCreateConflictMessage(fields));
      }

      throw error;
    }
  }

  async findMine(userId: string) {
    return this.prisma.client.orm.public.Resource
      .where({ submittedById: userId })
      .include('category')
      .include('tags', (tags) => tags.include('tag'))
      .include('submittedBy', (submittedBy) =>
        submittedBy.select('id', 'name', 'email', 'role'),
      )
      .orderBy((resource) => resource.createdAt.desc())
      .all();
  }

  async findOne(id: string) {
    return this.prisma.client.orm.public.Resource
      .where({ id })
      .include('category')
      .include('tags', (tags) => tags.include('tag'))
      .include('submittedBy', (submittedBy) =>
        submittedBy.select('id', 'name', 'email', 'role'),
      )
      .first();
  }

  async update(
    id: string,
    updateResourceDto: UpdateResourceDto,
    userId: string,
    role: string,
  ) {
    const resource = await this.prisma.client.orm.public.Resource
      .where({ id })
      .first();

    if (!resource) {
      throw new NotFoundException('Resource not found.');
    }

    if (role !== 'ADMIN' && resource.submittedById !== userId) {
      throw new ForbiddenException(
        'You can only update resources you submitted.',
      );
    }

    const { categoryId, tagIds, ...resourceData } =
      updateResourceDto;

    const data = {
      ...resourceData,
    };

    if (categoryId !== undefined) {
      data.category = categoryId
        ? (category) => category.connect({ id: categoryId })
        : (category) => category.disconnect();
    }

    return this.prisma.client.transaction(async (tx) => {
      if (tagIds !== undefined) {
        await tx.orm.public.ResourceTag
          .where({ resourceId: id })
          .deleteAll();
        if (tagIds.length > 0) {
          await tx.orm.public.ResourceTag.createAll(
            tagIds.map((tagId) => ({ resourceId: id, tagId })),
          );
        }
      }

      return tx.orm.public.Resource
        .where({ id })
        .include('category')
        .include('tags', (tags) => tags.include('tag'))
        .update(data);
    });
  }

  async remove(id: string, userId: string, role: string) {
    const resource = await this.prisma.client.orm.public.Resource
      .where({ id })
      .first();

    if (!resource) {
      throw new NotFoundException('Resource not found.');
    }

    if (role !== 'ADMIN' && resource.submittedById !== userId) {
      throw new ForbiddenException(
        'You can only delete resources you submitted.',
      );
    }

    return this.prisma.client.orm.public.Resource
      .where({ id })
      .delete();
  }

  async saveResource(resourceId: string, userId: string) {
    try {
      return await this.prisma.client.orm.public.SavedResource.create({
        userId,
        resourceId,
      });
    } catch (error) {
      if (isUniqueConstraintError(error)) {
        throw new ConflictException(
          'Resource is already saved.',
        );
      }

      throw error;
    }
  }

  async findSaved(userId: string) {
    return this.prisma.client.orm.public.SavedResource
      .where({ userId })
      .include('resource', (resource) =>
        resource
          .include('category')
          .include('tags', (tags) => tags.include('tag'))
          .include('submittedBy', (submittedBy) =>
            submittedBy.select('id', 'name', 'email', 'role'),
          ),
      )
      .orderBy((saved) => saved.createdAt.desc())
      .all();
  }

  async unsaveResource(resourceId: string, userId: string) {
    const savedResource = await this.prisma.client.orm.public.SavedResource
      .where({ userId, resourceId })
      .first();

    if (!savedResource) {
      throw new NotFoundException(
        'Saved resource not found.',
      );
    }

    return this.prisma.client.orm.public.SavedResource
      .where({ userId, resourceId })
      .delete();
  }

  async updateStatus(id: string, status: ResourceStatus) {
    const resource = await this.prisma.client.orm.public.Resource
      .where({ id })
      .first();

    if (!resource) {
      throw new NotFoundException('Resource not found.');
    }

    return this.prisma.client.orm.public.Resource
      .where({ id })
      .update({ status });
  }
}
