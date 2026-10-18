import { Module } from '@nestjs/common';
import { PrismaModule } from './prisma/prisma.module';
import { ResourcesModule } from './resources/resources.module';
import { CategoriesModule } from './categories/categories.module';
import { TagsModule } from './tags/tags.module';
import { AuthModule } from './auth/auth.module';
import { CollectionsModule } from './collections/collections.module';
import { HealthController } from './health.controller';
import { ThrottlerModule } from '@nestjs/throttler';

@Module({
  imports: [
    ThrottlerModule.forRoot([{ ttl: 60_000, limit: 5 }]),
    PrismaModule,
    ResourcesModule,
    CategoriesModule,
    TagsModule,
    AuthModule,
    CollectionsModule,
  ],
  controllers: [HealthController],
})
export class AppModule {}
