import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { isUniqueConstraintError } from '../prisma/errors';
import { CreateTagDto } from './dto/create-tag.dto';
import { UpdateTagDto } from './dto/update-tag.dto';

@Injectable()
export class TagsService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll() {
    return this.prisma.client.orm.public.Tag
      .orderBy((tag) => tag.name.asc())
      .all();
  }

  async create(createTagDto: CreateTagDto) {
    return this.prisma.client.orm.public.Tag.create({
      name: createTagDto.name,
      slug: createTagDto.name
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)/g, ''),
    });
  }

  async update(id: string, dto: UpdateTagDto) {
    try {
      const updated = await this.prisma.client.orm.public.Tag
        .where({ id })
        .update(dto.name === undefined ? {} : {
          name: dto.name,
          slug: dto.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, ''),
        });
      if (!updated) {
        throw new NotFoundException('Tag not found.');
      }
      return updated;
    } catch (error) {
      if (isUniqueConstraintError(error)) {
        throw new ConflictException('A tag with this name already exists.');
      }
      throw error;
    }
  }

  async remove(id: string) {
    const deleted = await this.prisma.client.orm.public.Tag
      .where({ id })
      .delete();
    if (!deleted) {
      throw new NotFoundException('Tag not found.');
    }
    return deleted;
  }
}
