import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Product, ProductImage, ProductVariant, Format, Material, Tag } from './entities';
import {
  FormatsController,
  ProductsController,
  TagsController,
  MaterialsController,
  ProductVariantsController,
} from './controllers';
import { TagsService, FormatsService, MaterialsService, ProductsService, ProductVariantsService } from './services';

@Module({
  imports: [TypeOrmModule.forFeature([Product, ProductImage, ProductVariant, Format, Material, Tag])],
  controllers: [FormatsController, TagsController, MaterialsController, ProductsController, ProductVariantsController],
  providers: [TagsService, FormatsService, MaterialsService, ProductsService, ProductVariantsService],
  exports: [TypeOrmModule, TagsService, FormatsService, MaterialsService, ProductsService],
})
export class CatalogModule {}
