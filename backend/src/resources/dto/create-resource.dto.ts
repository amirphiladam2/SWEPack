import { IsEnum, IsOptional, IsArray,IsString, IsUrl, MaxLength } from 'class-validator';
import { ResourceType } from 'generated/prisma/enums';

export class CreateResourceDto {
  @IsString()
  @MaxLength(150)
  title!: string;

  @IsUrl()
  url!: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;

  @IsEnum(ResourceType)
  type!: ResourceType;

  @IsOptional()
  @IsString()
  categoryId?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tagIds?: string[];
}