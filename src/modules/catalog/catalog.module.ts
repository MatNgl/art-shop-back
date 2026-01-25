import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Product, ProductImage, ProductVariant, Format, Material, Tag } from './entities';

@Module({
  imports: [TypeOrmModule.forFeature([Product, ProductImage, ProductVariant, Format, Material, Tag])],
  controllers: [],
  providers: [],
  exports: [TypeOrmModule],
})
export class CatalogModule {}
