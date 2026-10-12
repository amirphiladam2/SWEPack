import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '../../generated/prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';

@Injectable()
export class CategoriesService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll() {
    return this.prisma.category.findMany({
      include: {
        parent: true,
        children: true,
      },
      orderBy: {
        name: 'asc',
      },
    });
  }

  async create(createCategoryDto: CreateCategoryDto) {
    const { parentId, ...categoryData } = createCategoryDto;

    try {
      return await this.prisma.category.create({
        data: {
          ...categoryData,
          slug: createCategoryDto.name
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, '-')
            .replace(/(^-|-$)/g, ''),
          parent: parentId
            ? {
                connect: {
                  id: parentId,
                },
              }
            : undefined,
        },
      });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        throw new ConflictException(
          'A category with this name already exists.',
        );
      }

      throw error;
    }
  }

  async update(id: string, dto: UpdateCategoryDto) {
    const category = await this.prisma.category.findUnique({ where: { id } });
    if (!category) throw new NotFoundException('Category not found.');

    const data: Prisma.CategoryUpdateInput = {
      ...(dto.name !== undefined
        ? {
            name: dto.name,
            slug: dto.name
              .toLowerCase()
              .replace(/[^a-z0-9]+/g, '-')
              .replace(/(^-|-$)/g, ''),
          }
        : {}),
      ...(dto.description !== undefined ? { description: dto.description } : {}),
    };
    if (dto.parentId !== undefined) {
      data.parent = dto.parentId
        ? { connect: { id: dto.parentId } }
        : { disconnect: true };
    }

    try {
      return await this.prisma.category.update({ where: { id }, data });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        throw new ConflictException('A category with this name already exists.');
      }
      throw error;
    }
  }

  async remove(id: string) {
    try {
      return await this.prisma.category.delete({ where: { id } });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2025'
      ) {
        throw new NotFoundException('Category not found.');
      }
      throw error;
    }
  }
}