import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';

import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { ResourcesService } from './resources.service';
import { CreateResourceDto } from './dto/create-resource.dto';
import { ResourceQueryDto } from './dto/resource-query.dto';
import { AdminResourceQueryDto } from './dto/admin-resource-query.dto';

import { UpdateResourceDto } from './dto/update-resource.dto';

import { Roles } from 'src/auth/dto/roles.decorator';
import { RolesGuard } from 'src/auth/dto/roles.guard';
import { UpdateResourceStatusDto } from './dto/update-resource-status.dto';
import { ResourceMetadataDto } from './dto/resource-metadata.dto';
import { ResourceMetadataService } from './resource-metadata.service';

import { CurrentUser } from 'src/auth/current-user.decorator';
import type { AuthenticatedUser } from '../auth/interfaces/authenticated-user.interface';

@Controller('resources')
export class ResourcesController {
  constructor(
    private readonly resourcesService: ResourcesService,
    private readonly resourceMetadataService: ResourceMetadataService,
  ) { }


  @Get()
  findAll(@Query() query: ResourceQueryDto) {
    return this.resourcesService.findAll(query);
  }

  @Post()
  @UseGuards(JwtAuthGuard)
  create(
    @Body() createResourceDto: CreateResourceDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.resourcesService.create(createResourceDto, user.userId);
  }

  @Post('metadata')
  @UseGuards(JwtAuthGuard)
  previewMetadata(@Body() dto: ResourceMetadataDto) {
    return this.resourceMetadataService.fetchMetadata(dto.url);
  }


  @Get('mine')
  @UseGuards(JwtAuthGuard)
  findMine(@CurrentUser() user: AuthenticatedUser) {
    return this.resourcesService.findMine(user.userId);
  }

  @Get('saved')
  @UseGuards(JwtAuthGuard)
  findSaved(@CurrentUser() user: AuthenticatedUser) {
    return this.resourcesService.findSaved(user.userId);
  }

  @Get('admin')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  findAllForAdmin(@Query() query: AdminResourceQueryDto) {
    return this.resourcesService.findAllForAdmin(query);
  }

  @Get('admin/summary')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  getAdminSummary() {
    return this.resourcesService.getAdminSummary();
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard)
  findOne(@Param('id') id: string) {
    return this.resourcesService.findOne(id);
  }

  @Post(':id/save')
  @UseGuards(JwtAuthGuard)
  save(
    @Param('id') resourceId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.resourcesService.saveResource(
      resourceId,
      user.userId,
    );
  }

  @Delete(':id/save')
  @UseGuards(JwtAuthGuard)
  unsave(
    @Param('id') resourceId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.resourcesService.unsaveResource(
      resourceId,
      user.userId,
    );
  }


  @Patch(':id')
  @UseGuards(JwtAuthGuard)
  update(
    @Param('id') id: string,
    @Body() updateResourceDto: UpdateResourceDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.resourcesService.update(
      id,
      updateResourceDto,
      user.userId,
      user.role,
    );
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  remove(
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.resourcesService.remove(
      id,
      user.userId,
      user.role,
    );
  }

  @Patch(':id/status')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  updateStatus(
    @Param('id') id: string,
    @Body() dto: UpdateResourceStatusDto,
  ) {
    return this.resourcesService.updateStatus(id, dto.status);
  }

}
