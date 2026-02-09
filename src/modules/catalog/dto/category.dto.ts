import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { IsString, IsNotEmpty, MaxLength, IsInt, Min, IsOptional } from 'class-validator';
import { Type } from 'class-transformer';

// ========================================
// CREATE
// ========================================
export class CreateCategoryDto {
  @ApiProperty({ description: 'Nom de la catégorie', example: 'Illustrations' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  name!: string;

  @ApiPropertyOptional({ description: 'Slug (généré automatiquement si non fourni)', example: 'illustrations' })
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
export class UpdateCategoryDto extends PartialType(CreateCategoryDto) {}

// ========================================
// RESPONSE
// ========================================
export class CategoryResponseDto {
  @ApiProperty({ description: 'UUID de la catégorie' })
  id!: string;

  @ApiProperty({ description: 'Nom de la catégorie' })
  name!: string;

  @ApiProperty({ description: 'Slug unique' })
  slug!: string;

  @ApiProperty({ description: 'Position pour le tri' })
  position!: number;

  @ApiProperty({ description: 'Nombre de sous-catégories', required: false })
  subcategoriesCount?: number;

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

export class CategoryWithSubcategoriesResponseDto extends CategoryResponseDto {
  @ApiProperty({ description: 'Liste des sous-catégories', type: () => [SubcategoryResponseDto] })
  subcategories!: SubcategoryResponseDto[];
}

// Import circulaire évité - on déclare le type ici
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

  @ApiProperty({ description: 'ID du créateur' })
  createdBy!: string;

  @ApiProperty({ description: 'Date de création' })
  createdAt!: Date;

  @ApiPropertyOptional({ description: 'ID du modificateur' })
  modifiedBy?: string;

  @ApiProperty({ description: 'Date de modification' })
  updatedAt!: Date;
}
