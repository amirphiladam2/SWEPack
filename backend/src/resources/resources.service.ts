import { ConflictException, Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { Prisma } from '../../generated/prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateResourceDto } from './dto/create-resource.dto';
import { UpdateResourceDto } from './dto/update-resource.dto';
import { ResourceQueryDto } from './dto/resource-query.dto';
import { ResourceStatus } from 'generated/prisma/enums';

@Injectable()
export class ResourcesService {
  constructor(private readonly prisma: PrismaService) { }
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

    const orderBy =
      sort === 'oldest'
        ? { createdAt: 'asc' as const }
        : sort === 'title'
          ? { title: 'asc' as const }
          : { createdAt: 'desc' as const };

    const [resources, total] = await this.prisma.$transaction([
      this.prisma.resource.findMany({
        where,
        include: {
          category: true,
          tags: {
            include: { tag: true },
          },
          submittedBy: {
            select: {
              id: true,
              name: true,
            },
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


  async create(createResourceDto: CreateResourceDto, userId: string) {
    const { categoryId, tagIds, ...resourceData } = createResourceDto;

    try {
      return await this.prisma.resource.create({
        data: {
          ...resourceData,

          slug: await this.generateUniqueSlug(createResourceDto.title),

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

        include: {
          category: true,
          tags: {
            include: {
              tag: true,
            },
          },
        },
      });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        throw new ConflictException(
          'A resource with this URL or title already exists.',
        );
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