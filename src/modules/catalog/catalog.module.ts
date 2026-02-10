import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import {
  Product,
  ProductImage,
  ProductVariant,
  ProductVariantImage,
  Format,
  Material,
  Tag,
  Category,
  Subcategory,
} from './entities';
import {
  FormatsController,
  ProductsController,
  TagsController,
  MaterialsController,
  ProductVariantsController,
  ProductImagesController,
  ProductVariantImagesController,
  CategoriesController,
  SubcategoriesController,
} from './controllers';
import {
  TagsService,
  FormatsService,
  MaterialsService,
  ProductsService,
  ProductVariantsService,
  ProductImagesService,
  ProductVariantImagesService,
  CategoriesService,
  SubcategoriesService,
} from './services';

// Modules
import { ActivityLogModule } from '../activity-logs/activity-log.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Product,
      ProductImage,
      ProductVariant,
      ProductVariantImage,
      Format,
      Material,
      Tag,
      Category,
      Subcategory,
    ]),
    ActivityLogModule,
    // StorageModule retiré car @Global() dans AppModule
  ],
  controllers: [
    FormatsController,
    TagsController,
    MaterialsController,
    ProductsController,
    ProductVariantsController,
    ProductImagesController,
    ProductVariantImagesController,
    CategoriesController,
    SubcategoriesController,
  ],
  providers: [
    TagsService,
    FormatsService,
    MaterialsService,
    ProductsService,
    ProductVariantsService,
    ProductImagesService,
    ProductVariantImagesService,
    CategoriesService,
    SubcategoriesService,
  ],
  exports: [
    TypeOrmModule,
    TagsService,
    FormatsService,
    MaterialsService,
    ProductsService,
    ProductVariantsService,
    ProductImagesService,
    ProductVariantImagesService,
    CategoriesService,
    SubcategoriesService,
  ],
})
export class CatalogModule {}
