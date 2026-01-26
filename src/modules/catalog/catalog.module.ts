import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Product, ProductImage, ProductVariant, Format, Material, Tag } from './entities';
import { TagsService } from './services/tags.service';
import { FormatsService } from './services/formats.service';
import { FormatsController, TagsController } from './controllers';
import { MaterialsController } from './controllers/materials.controller';
import { MaterialsService } from './services/materials.service';
@Module({
  imports: [TypeOrmModule.forFeature([Product, ProductImage, ProductVariant, Format, Material, Tag])],
  controllers: [FormatsController, TagsController, MaterialsController],
  providers: [TagsService, FormatsService, MaterialsService],
  exports: [TypeOrmModule, TagsService, FormatsService, MaterialsService],
})
export class CatalogModule {}
