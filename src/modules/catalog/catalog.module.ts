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
} from './controllers';
import {
  TagsService,
  FormatsService,
  MaterialsService,
  ProductsService,
  ProductVariantsService,
  ProductImagesService,
  ProductVariantImagesService,
} from './services';

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
  ],
  controllers: [
    FormatsController,
    TagsController,
    MaterialsController,
    ProductsController,
    ProductVariantsController,
    ProductImagesController,
    ProductVariantImagesController,
  ],
  providers: [
    TagsService,
    FormatsService,
    MaterialsService,
    ProductsService,
    ProductVariantsService,
    ProductImagesService,
    ProductVariantImagesService,
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
  ],
})
export class CatalogModule {}
