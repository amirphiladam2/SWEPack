import {
  ConflictException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '../../generated/prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateResourceDto } from './dto/create-resource.dto';
import { UpdateResourceDto } from './dto/update-resource.dto';
import { ResourceQueryDto } from './dto/resource-query.dto';
import { ResourceStatus } from 'generated/prisma/enums';
import { AdminResourceQueryDto } from './dto/admin-resource-query.dto';

const submissionResourceInclude = {
  category: true,
  tags: {
    include: {
      tag: true,
    },
  },
} satisfies Prisma.ResourceInclude;

@Injectable()
export class ResourcesService {
  private readonly logger = new Logger(ResourcesService.name);

  constructor(private readonly prisma: PrismaService) { }

  private getUniqueConstraintFields(
    error: Prisma.PrismaClientKnownRequestError,
  ): string[] {
    const target = error.meta?.target;

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
      await this.prisma.resource.findUnique({
        where: { slug },
      })
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

    const where = {
      status: 'PUBLISHED' as const,

      ...(search && {
        OR: [
          {
            title: {
              contains: search,
              mode: 'insensitive' as const,
            },
          },
          {
            description: {
              contains: search,
              mode: 'insensitive' as const,
            },
          },
        ],
      }),

      ...(type && { type }),
      ...(categoryId && { categoryId }),

      ...(tagId && {
        tags: {
          some: { tagId },
        },
      }),
    };

    const orderBy: Prisma.ResourceOrderByWithRelationInput[] =
      sort === 'oldest'
        ? [{ createdAt: 'asc' }, { id: 'asc' }]
        : sort === 'title'
          ? [{ title: 'asc' }, { id: 'asc' }]
          : [{ createdAt: 'desc' }, { id: 'asc' }];

    const [resources, total] = await this.prisma.$transaction([
      this.prisma.resource.findMany({
        where,
        select: {
          id: true,
          title: true,
          url: true,
          description: true,
          type: true,
          logoUrl: true,
          previewImageUrl: true,
          category: {
            select: { id: true, name: true },
          },
          tags: {
            select: { tag: { select: { name: true } } },
          },
        },
        orderBy,
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.resource.count({ where }),
    ]);

    return {
      data: resources,
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
    const where = {
      ...(status && { status }),
      ...(search && {
        OR: [
          { title: { contains: search, mode: 'insensitive' as const } },
          { url: { contains: search, mode: 'insensitive' as const } },
        ],
      }),
    };

    const [resources, total] = await this.prisma.$transaction([
      this.prisma.resource.findMany({
        where,
        include: {
          category: true,
          tags: { include: { tag: true } },
          submittedBy: {
            select: { id: true, name: true, email: true, role: true },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.resource.count({ where }),
    ]);

    return {
      data: resources,
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
      this.prisma.resource.count(),
      this.prisma.resource.count({ where: { status: 'PENDING' } }),
      this.prisma.resource.count({ where: { status: 'PUBLISHED' } }),
      this.prisma.resource.count({ where: { status: 'REJECTED' } }),
      this.prisma.resource.count({ where: { status: 'ARCHIVED' } }),
    ]);

    return { total, pending, published, rejected, archived };
  }


  async create(createResourceDto: CreateResourceDto, userId: string) {
    const { categoryId, tagIds, ...resourceData } = createResourceDto;

    try {
      const existingResource = await this.prisma.resource.findUnique({
        where: { url: createResourceDto.url },
        include: submissionResourceInclude,
      });
      if (existingResource) {
        if (existingResource.submittedById === userId) {
          return existingResource;
        }
        throw new ConflictException(
          'A resource with this URL has already been submitted.',
        );
      }

      const slug = await this.generateUniqueSlug(createResourceDto.title);
      const resource = await this.prisma.resource.create({
        data: {
          ...resourceData,

          slug,

          submittedBy: {
            connect: {
              id: userId,
            },
          },
          category: categoryId
            ? {
              connect: {
                id: categoryId,
              },
            }
            : undefined,

          tags: tagIds
            ? {
              create: tagIds.map((tagId) => ({
                tag: {
                  connect: {
                    id: tagId,
                  },
                },
              })),
            }
            : undefined,
        },

        include: submissionResourceInclude,
      });
      this.logger.log('Resource submission created with PENDING status.');
      return resource;
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        const existingResource = await this.prisma.resource.findUnique({
          where: { url: createResourceDto.url },
          include: submissionResourceInclude,
        });
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
    return this.prisma.resource.findMany({
      where: {
        submittedById: userId,
      },
      include: {
        category: true,
        tags: {
          include: {
            tag: true,
          },
        },
        submittedBy: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
  }
  async findOne(id: string) {
    return this.prisma.resource.findUnique({
      where: {
        id,
      },
      include: {
        category: true,
        tags: {
          include: {
            tag: true,
          },
        },
        submittedBy: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
          },
        },
      },
    });
  }

  async update(
    id: string,
    updateResourceDto: UpdateResourceDto,
    userId: string,
    role: string,
  ) {
    const resource = await this.prisma.resource.findUnique({
      where: { id },
    });

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

    const data: Prisma.ResourceUpdateInput = {
      ...resourceData,
    };

    if (categoryId !== undefined) {
      data.category = categoryId
        ? { connect: { id: categoryId } }
        : { disconnect: true };
    }

    if (tagIds !== undefined) {
      data.tags = {
        deleteMany: {},
        ...(tagIds.length > 0
          ? {
            create: tagIds.map((tagId) => ({
              tag: {
                connect: { id: tagId },
              },
            })),
          }
          : {}),
      };
    }

    return this.prisma.resource.update({
      where: { id },
      data,
      include: {
        category: true,
        tags: {
          include: { tag: true },
        },
      },
    });
  }

  async remove(id: string, userId: string, role: string) {
    const resource = await this.prisma.resource.findUnique({
      where: { id },
    });

    if (!resource) {
      throw new NotFoundException('Resource not found.');
    }

    if (role !== 'ADMIN' && resource.submittedById !== userId) {
      throw new ForbiddenException(
        'You can only delete resources you submitted.',
      );
    }

    return this.prisma.resource.delete({
      where: { id },
    });
  }

  async saveResource(resourceId: string, userId: string) {
    try {
      return await this.prisma.savedResource.create({
        data: {
          userId,
          resourceId,
        },
      });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        throw new ConflictException(
          'Resource is already saved.',
        );
      }

      throw error;
    }
  }

  async findSaved(userId: string) {
    return this.prisma.savedResource.findMany({
      where: {
        userId,
      },
      include: {
        resource: {
          include: {
            category: true,
            tags: {
              include: {
                tag: true,
              },
            },
            submittedBy: {
              select: {
                id: true,
                name: true,
                email: true,
                role: true,
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

  async unsaveResource(resourceId: string, userId: string) {
    const savedResource = await this.prisma.savedResource.findUnique({
      where: {
        userId_resourceId: {
          userId,
          resourceId,
        },
      },
    });

    if (!savedResource) {
      throw new NotFoundException(
        'Saved resource not found.',
      );
    }

    return this.prisma.savedResource.delete({
      where: {
        userId_resourceId: {
          userId,
          resourceId,
        },
      },
    });
  }

  async updateStatus(id: string, status: ResourceStatus) {
    const resource = await this.prisma.resource.findUnique({
      where: { id },
    });

    if (!resource) {
      throw new NotFoundException('Resource not found.');
    }

    return this.prisma.resource.update({
      where: { id },
      data: { status },
    });
  }
}