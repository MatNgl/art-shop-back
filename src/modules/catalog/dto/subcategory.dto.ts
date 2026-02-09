import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { IsString, IsNotEmpty, MaxLength, IsInt, Min, IsOptional } from 'class-validator';
import { Type } from 'class-transformer';

// ========================================
// CREATE
// ========================================
export class CreateSubcategoryDto {
  @ApiProperty({ description: 'Nom de la sous-catégorie', example: 'Bleu' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  name!: string;

  @ApiPropertyOptional({ description: 'Slug (généré automatiquement si non fourni)', example: 'bleu' })
  @IsString()
  @IsOptional()
  @MaxLength(100)
  slug?: string;

  @ApiPropertyOptional({ description: 'Position pour le tri', example: 0, default: 0 })
  @IsInt()
  @Min(0)
  @IsOptional()
  @Type(() => Number)
  position?: number;
}

// ========================================
// UPDATE
// ========================================
export class UpdateSubcategoryDto extends PartialType(CreateSubcategoryDto) {}

// ========================================
// RESPONSE
// ========================================
export class SubcategoryResponseDto {
  @ApiProperty({ description: 'UUID de la sous-catégorie' })
  id!: string;

  @ApiProperty({ description: 'Nom de la sous-catégorie' })
  name!: string;

  @ApiProperty({ description: 'Slug unique' })
  slug!: string;

  @ApiProperty({ description: 'Position pour le tri' })
  position!: number;

  @ApiProperty({ description: 'ID de la catégorie parente' })
  categoryId!: string;

  @ApiProperty({ description: 'Nombre de produits associés', required: false })
  productsCount?: number;

  @ApiProperty({ description: 'ID du créateur' })
  createdBy!: string;

  @ApiProperty({ description: 'Date de création' })
  createdAt!: Date;

  @ApiPropertyOptional({ description: 'ID du modificateur' })
  modifiedBy?: string;

  @ApiProperty({ description: 'Date de modification' })
  updatedAt!: Date;
}

// ========================================
// RESPONSE WITH CATEGORY
// ========================================
export class SubcategoryWithCategoryResponseDto extends SubcategoryResponseDto {
  @ApiProperty({ description: 'Catégorie parente' })
  category!: {
    id: string;
    name: string;
    slug: string;
  };
}
