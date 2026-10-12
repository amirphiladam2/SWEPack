import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '../../generated/prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateTagDto } from './dto/create-tag.dto';
import { UpdateTagDto } from './dto/update-tag.dto';

@Injectable()
export class TagsService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll() {
    return this.prisma.tag.findMany({
      orderBy: {
        name: 'asc',
      },
    });
  }

  async create(createTagDto: CreateTagDto) {
    return this.prisma.tag.create({
      data: {
        name: createTagDto.name,
        slug: createTagDto.name
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, '-')
          .replace(/(^-|-$)/g, ''),
      },
    });
  }

  async update(id: string, dto: UpdateTagDto) {
    try {
      return await this.prisma.tag.update({
        where: { id },
        data: dto.name === undefined ? {} : {
          name: dto.name,
          slug: dto.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, ''),
        },
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025') {
        throw new NotFoundException('Tag not found.');
      }
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        throw new ConflictException('A tag with this name already exists.');
      }
      throw error;
    }
  }

  async remove(id: string) {
    try {
      return await this.prisma.tag.delete({ where: { id } });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025') {
        throw new NotFoundException('Tag not found.');
      }
      throw error;
    }
  }
}