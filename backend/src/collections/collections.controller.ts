
import {
  Body,
  Controller,
  Get,
  Post,
  Delete,
  Param,
  Patch,
  UseGuards,
} from '@nestjs/common';

import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import type { AuthenticatedUser } from '../auth/interfaces/authenticated-user.interface';
import { UpdateCollectionDto } from './dto/update-collection.dto';
import { AddResourceDto } from './dto/add-resource.dto';
import { CollectionsService } from './collections.service';
import { CreateCollectionDto } from './dto/create-collection.dto';

@Controller('collections')
@UseGuards(JwtAuthGuard)
export class CollectionsController {
  constructor(
    private readonly collectionsService: CollectionsService,
  ) { }

  @Post()
  create(
    @Body() createCollectionDto: CreateCollectionDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.collectionsService.create(
      createCollectionDto,
      user.userId,
    );
  }

  @Get()
  findAll(@CurrentUser() user: AuthenticatedUser) {
    return this.collectionsService.findAll(user.userId);
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() updateCollectionDto: UpdateCollectionDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.collectionsService.update(
      id,
      user.userId,
      updateCollectionDto,
    );
  }

  @Delete(':id')
  remove(
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.collectionsService.remove(id, user.userId);
  }

  @Post(':id/resources')
  addResource(
    @Param('id') collectionId: string,
    @Body() addResourceDto: AddResourceDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.collectionsService.addResource(
      collectionId,
      user.userId,
      addResourceDto,
    );
  }

  @Delete(':id/resources/:resourceId')
  removeResource(
    @Param('id') collectionId: string,
    @Param('resourceId') resourceId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.collectionsService.removeResource(
      collectionId,
      resourceId,
      user.userId,
    );
  }

  @Get(':id/resources')
  findResources(
    @Param('id') collectionId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.collectionsService.findResources(
      collectionId,
      user.userId,
    );
  }


}
