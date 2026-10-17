import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { ResourcesController } from './resources.controller';
import { ResourcesService } from './resources.service';
import { ResourceMetadataService } from './resource-metadata.service';

@Module({
  imports: [PrismaModule],
  controllers: [ResourcesController],
  providers: [ResourcesService, ResourceMetadataService],
})
export class ResourcesModule {}
