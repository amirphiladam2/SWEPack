import {
  ConflictException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { or } from '@prisma/orm-postgres/orm-client';
import { PrismaService, uniqueConstraintName } from '../prisma/prisma.service';
import { CreateResourceDto } from './dto/create-resource.dto';
import { UpdateResourceDto } from './dto/update-resource.dto';
import { ResourceQueryDto } from './dto/resource-query.dto';
import { ResourceStatus } from '../prisma/enums';
import { AdminResourceQueryDto } from './dto/admin-resource-query.dto';

@Injectable()
export class ResourcesService {
  private readonly logger = new Logger(ResourcesService.name);

  constructor(private readonly prisma: PrismaService) { }

  private getUniqueConstraintFields(
    error: unknown,
  ): string[] {
    return uniqueConstraintName(error).map((constraint) => constraint.toLowerCase());
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
      await this.prisma.orm.Resource.where({ slug }).first()
    ) {
      slug = `${baseSlug}-${counter}`;
      counter++;
    }

    return slug;
  }

  private likePattern(search: string): string {
    // `contains` with an insensitive mode matched substrings literally; the
    // LIKE pattern it becomes must escape the pattern metacharacters.
    return `%${search.replace(/[\\%_]/g, (match) => `\\${match}`)}%`;
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

    const { rows, total } = await this.prisma.transaction(async (tx) => {
      let filtered = tx.orm.public.Resource.where({ status: 'PUBLISHED' });
      if (search) {
        const pattern = this.likePattern(search);
        filtered = filtered.where((r) =>
          or(r.title.ilike(pattern), r.description.ilike(pattern)),
        );
      }
      if (type) filtered = filtered.where({ type });
      if (categoryId) filtered = filtered.where({ categoryId });
      if (tagId) filtered = filtered.where((r) => r.tags.some((rt) => rt.tagId.eq(tagId)));

      const ordered =
        sort === 'oldest'
          ? filtered.orderBy((r) => r.createdAt.asc()).orderBy((r) => r.id.asc())
          : sort === 'title'
            ? filtered.orderBy((r) => r.title.asc()).orderBy((r) => r.id.asc())
            : filtered.orderBy((r) => r.createdAt.desc()).orderBy((r) => r.id.asc());

      const rows = await ordered
        .select('id', 'title', 'url', 'description', 'type', 'logoUrl', 'previewImageUrl')
        .include('category', (category) => category.select('id', 'name'))
        .include('tags', (tags) => tags.include('tag', (tag) => tag.select('name')))
        .offset((page - 1) * limit)
        .limit(limit)
        .all();

      const { total } = await filtered.aggregate((a) => ({ total: a.count() }));
      return { rows, total };
    });

    return {
      data: rows.map((resource) => ({
        ...resource,
        tags: resource.tags.map(({ tag }) => ({ tag })),
      })),
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

    const { rows, total } = await this.prisma.transaction(async (tx) => {
      let filtered = tx.orm.public.Resource as typeof tx.orm.public.Resource;
      if (status) filtered = filtered.where({ status });
      if (search) {
        const pattern = this.likePattern(search);
        filtered = filtered.where((r) => or(r.title.ilike(pattern), r.url.ilike(pattern)));
      }

      const rows = await filtered
        .include('category')
        .include('tags', (tags) => tags.include('tag'))
        .include('submittedBy', (user) => user.select('id', 'name', 'email', 'role'))
        .orderBy((r) => r.createdAt.desc())
        .offset((page - 1) * limit)
        .limit(limit)
        .all();

      const { total } = await filtered.aggregate((a) => ({ total: a.count() }));
      return { rows, total };
    });

    return {
      data: rows,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async getAdminSummary() {
    const [total, pending, published, rejected, archived] = await Promise.all([
      this.prisma.orm.Resource.aggregate((a) => ({ total: a.count() })),
      this.prisma.orm.Resource.where({ status: 'PENDING' }).aggregate((a) => ({ total: a.count() })),
      this.prisma.orm.Resource.where({ status: 'PUBLISHED' }).aggregate((a) => ({ total: a.count() })),
      this.prisma.orm.Resource.where({ status: 'REJECTED' }).aggregate((a) => ({ total: a.count() })),
      this.prisma.orm.Resource.where({ status: 'ARCHIVED' }).aggregate((a) => ({ total: a.count() })),
    ]);

    return {
      total: total.total,
      pending: pending.total,
      published: published.total,
      rejected: rejected.total,
      archived: archived.total,
    };
  }


  async create(createResourceDto: CreateResourceDto, userId: string) {
    const { categoryId, tagIds, ...resourceData } = createResourceDto;

    try {
      const existingResource = await this.prisma.orm.Resource
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

      const resource = await this.prisma.transaction(async (tx) => {
        const created = await tx.orm.public.Resource.create({
          ...resourceData,
          slug,
          submittedById: userId,
          categoryId: categoryId ?? null,
        });

        if (tagIds?.length) {
          for (const tagId of tagIds) {
            await tx.orm.public.ResourceTag.create({
              resourceId: created.id,
              tagId,
            });
          }
        }

        return created;
      });

      const full = await this.prisma.orm.Resource
        .where({ id: resource.id })
        .include('category')
        .include('tags', (tags) => tags.include('tag'))
        .first();

      this.logger.log('Resource submission created with PENDING status.');
      return full;
    } catch (error) {
      if (uniqueConstraintName(error).length > 0) {
        const existingResource = await this.prisma.orm.Resource
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
    return this.prisma.orm.Resource
      .where({ submittedById: userId })
      .include('category')
      .include('tags', (tags) => tags.include('tag'))
      .include('submittedBy', (user) => user.select('id', 'name', 'email', 'role'))
      .orderBy((r) => r.createdAt.desc())
      .all();
  }

  async findOne(id: string) {
    return this.prisma.orm.Resource
      .where({ id })
      .include('category')
      .include('tags', (tags) => tags.include('tag'))
      .include('submittedBy', (user) => user.select('id', 'name', 'email', 'role'))
      .first();
  }

  async update(
    id: string,
    updateResourceDto: UpdateResourceDto,
    userId: string,
    role: string,
  ) {
    const resource = await this.prisma.orm.Resource.first({ id });

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

    const data: {
      title?: string;
      url?: string;
      description?: string | null;
      type?: string;
      logoUrl?: string | null;
      faviconUrl?: string | null;
      previewImageUrl?: string | null;
      domain?: string | null;
      notes?: string | null;
      categoryId?: string | null;
    } = {
      ...resourceData,
    };

    if (categoryId !== undefined) {
      data.categoryId = categoryId;
    }

    return this.prisma.transaction(async (tx) => {
      const updated = await tx.orm.public.Resource.where({ id }).update(data);
      if (!updated) throw new NotFoundException('Resource not found.');

      if (tagIds !== undefined) {
        await tx.orm.public.ResourceTag.where({ resourceId: id }).deleteAll();
        for (const tagId of tagIds) {
          await tx.orm.public.ResourceTag.create({ resourceId: id, tagId });
        }
      }

      return tx.orm.public.Resource
        .where({ id })
        .include('category')
        .include('tags', (tags) => tags.include('tag'))
        .first();
    });
  }

  async remove(id: string, userId: string, role: string) {
    const resource = await this.prisma.orm.Resource.first({ id });

    if (!resource) {
      throw new NotFoundException('Resource not found.');
    }

    if (role !== 'ADMIN' && resource.submittedById !== userId) {
      throw new ForbiddenException(
        'You can only delete resources you submitted.',
      );
    }

    const removed = await this.prisma.orm.Resource.where({ id }).delete();
    if (!removed) throw new NotFoundException('Resource not found.');
    return removed;
  }

  async saveResource(resourceId: string, userId: string) {
    try {
      return await this.prisma.orm.SavedResource.create({
        userId,
        resourceId,
      });
    } catch (error) {
      if (uniqueConstraintName(error).length > 0) {
        throw new ConflictException(
          'Resource is already saved.',
        );
      }

      throw error;
    }
  }

  async findSaved(userId: string) {
    return this.prisma.orm.SavedResource
      .where({ userId })
      .include('resource', (resource) =>
        resource
          .include('category')
          .include('tags', (tags) => tags.include('tag'))
          .include('submittedBy', (user) => user.select('id', 'name', 'email', 'role')),
      )
      .orderBy((sr) => sr.createdAt.desc())
      .all();
  }

  async unsaveResource(resourceId: string, userId: string) {
    const savedResource = await this.prisma.orm.SavedResource.where({
      userId,
      resourceId,
    }).first();

    if (!savedResource) {
      throw new NotFoundException(
        'Saved resource not found.',
      );
    }

    const removed = await this.prisma.orm.SavedResource.where({
      userId,
      resourceId,
    }).delete();
    if (!removed) throw new NotFoundException('Saved resource not found.');
    return removed;
  }

  async updateStatus(id: string, status: ResourceStatus) {
    const resource = await this.prisma.orm.Resource.first({ id });

    if (!resource) {
      throw new NotFoundException('Resource not found.');
    }

    const updated = await this.prisma.orm.Resource.where({ id }).update({ status });
    if (!updated) throw new NotFoundException('Resource not found.');
    return updated;
  }
}
