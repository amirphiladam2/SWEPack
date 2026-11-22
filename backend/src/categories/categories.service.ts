import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { isUniqueConstraintError, PrismaService } from '../prisma/prisma.service';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';

@Injectable()
export class CategoriesService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll() {
    return this.prisma.orm.Category
      .include('parent')
      .include('children')
      .orderBy((c) => c.name.asc())
      .all();
  }

  async create(createCategoryDto: CreateCategoryDto) {
    const { parentId, ...categoryData } = createCategoryDto;

    try {
      return await this.prisma.orm.Category.create({
        ...categoryData,
        slug: createCategoryDto.name
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, '-')
          .replace(/(^-|-$)/g, ''),
        parentId: parentId ?? null,
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
    const category = await this.prisma.orm.Category.first({ id });
    if (!category) throw new NotFoundException('Category not found.');

    const data: {
      name?: string;
      slug?: string;
      description?: string | null;
      parentId?: string | null;
    } = {
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
      data.parentId = dto.parentId;
    }

    if (Object.keys(data).length === 0) return category;

    try {
      return await this.prisma.orm.Category.where({ id }).update(data);
    } catch (error) {
      if (isUniqueConstraintError(error)) {
        throw new ConflictException('A category with this name already exists.');
      }
      throw error;
    }
  }

  async remove(id: string) {
    const removed = await this.prisma.orm.Category.where({ id }).delete();
    if (!removed) throw new NotFoundException('Category not found.');
    return removed;
  }
}
