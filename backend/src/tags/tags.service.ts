import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { isUniqueConstraintError, PrismaService } from '../prisma/prisma.service';
import { CreateTagDto } from './dto/create-tag.dto';
import { UpdateTagDto } from './dto/update-tag.dto';

@Injectable()
export class TagsService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll() {
    return this.prisma.orm.Tag.orderBy((t) => t.name.asc()).all();
  }

  async create(createTagDto: CreateTagDto) {
    return this.prisma.orm.Tag.create({
      name: createTagDto.name,
      slug: createTagDto.name
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)/g, ''),
    });
  }

  async update(id: string, dto: UpdateTagDto) {
    const existing = await this.prisma.orm.Tag.first({ id });
    if (!existing) throw new NotFoundException('Tag not found.');
    if (dto.name === undefined) return existing;

    try {
      return await this.prisma.orm.Tag.where({ id }).update({
        name: dto.name,
        slug: dto.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, ''),
      });
    } catch (error) {
      if (isUniqueConstraintError(error)) {
        throw new ConflictException('A tag with this name already exists.');
      }
      throw error;
    }
  }

  async remove(id: string) {
    const removed = await this.prisma.orm.Tag.where({ id }).delete();
    if (!removed) throw new NotFoundException('Tag not found.');
    return removed;
  }
}
