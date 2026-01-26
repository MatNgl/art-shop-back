import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Product, ProductImage, ProductVariant, Format, Material, Tag } from './entities';
import { TagsService } from './services/tags.service';
import { FormatsService } from './services/formats.service';
import { FormatsController, TagsController } from './controllers';
@Module({
  imports: [TypeOrmModule.forFeature([Product, ProductImage, ProductVariant, Format, Material, Tag])],
  controllers: [FormatsController, TagsController],
  providers: [TagsService, FormatsService],
  exports: [TypeOrmModule, TagsService, FormatsService],
})
export class CatalogModule {}
