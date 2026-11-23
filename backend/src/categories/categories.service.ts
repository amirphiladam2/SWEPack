import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { isUniqueConstraintError } from '../prisma/errors';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';

@Injectable()
export class CategoriesService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll() {
    return this.prisma.client.orm.public.Category
      .include('parent')
      .include('children')
      .orderBy((category) => category.name.asc())
      .all();
  }

  async create(createCategoryDto: CreateCategoryDto) {
    const { parentId, ...categoryData } = createCategoryDto;

    try {
      return await this.prisma.client.orm.public.Category.create({
        ...categoryData,
        slug: createCategoryDto.name
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, '-')
          .replace(/(^-|-$)/g, ''),
        ...(parentId
          ? {
              parent: (parent) => parent.connect({ id: parentId }),
            }
          : {}),
      });
    } catch (error) {
      if (isUniqueConstraintError(error)) {
        throw new ConflictException(
          'A category with this name already exists.',
        );
      }

      throw error;
    }
  }

  async update(id: string, dto: UpdateCategoryDto) {
    const category = await this.prisma.client.orm.public.Category
      .where({ id })
      .first();
    if (!category) throw new NotFoundException('Category not found.');

    const data = {
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
        ? (parent) => parent.connect({ id: dto.parentId })
        : (parent) => parent.disconnect();
    }

    try {
      return await this.prisma.client.orm.public.Category
        .where({ id })
        .update(data);
    } catch (error) {
      if (isUniqueConstraintError(error)) {
        throw new ConflictException('A category with this name already exists.');
      }
      throw error;
    }
  }

  async remove(id: string) {
    const deleted = await this.prisma.client.orm.public.Category
      .where({ id })
      .delete();
    if (!deleted) throw new NotFoundException('Category not found.');
    return deleted;
  }
}
