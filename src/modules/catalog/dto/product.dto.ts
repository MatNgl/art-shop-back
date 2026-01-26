import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsArray, IsBoolean, IsEnum, IsNotEmpty, IsOptional, IsString, IsUUID, MaxLength } from 'class-validator';
import { ProductStatus } from '../entities/product.entity';
import { TagResponseDto } from './tag.dto';

// ========================================
// CREATE — POST /products
// ========================================
export class CreateProductDto {
  @ApiProperty({
    description: "Nom de l'œuvre",
    example: 'Coucher de soleil sur Tokyo',
    maxLength: 255,
  })
  @IsString({ message: 'Le nom doit être une chaîne de caractères' })
  @IsNotEmpty({ message: 'Le nom est obligatoire' })
  @MaxLength(255, { message: 'Le nom ne peut pas dépasser 255 caractères' })
  name!: string;

  @ApiPropertyOptional({
    description: "Description complète de l'œuvre",
    example: "Cette œuvre capture la beauté éphémère d'un coucher de soleil sur la baie de Tokyo...",
  })
  @IsOptional()
  @IsString({ message: 'La description doit être une chaîne de caractères' })
  description?: string;

  @ApiPropertyOptional({
    description: 'Description courte (pour les listes)',
    example: 'Coucher de soleil japonais aux tons orangés',
    maxLength: 500,
  })
  @IsOptional()
  @IsString({ message: 'La description courte doit être une chaîne de caractères' })
  @MaxLength(500, { message: 'La description courte ne peut pas dépasser 500 caractères' })
  shortDescription?: string;

  @ApiPropertyOptional({
    description: 'Statut du produit',
    enum: ProductStatus,
    default: ProductStatus.DRAFT,
    example: ProductStatus.DRAFT,
  })
  @IsOptional()
  @IsEnum(ProductStatus, { message: 'Le statut doit être DRAFT, PUBLISHED ou ARCHIVED' })
  status?: ProductStatus;

  @ApiPropertyOptional({
    description: 'Produit mis en avant ?',
    default: false,
    example: false,
  })
  @IsOptional()
  @IsBoolean({ message: 'featured doit être un booléen' })
  featured?: boolean;

  @ApiPropertyOptional({
    description: 'Titre SEO (balise title)',
    example: 'Coucher de soleil Tokyo | Art Shop',
    maxLength: 255,
  })
  @IsOptional()
  @IsString({ message: 'Le titre SEO doit être une chaîne de caractères' })
  @MaxLength(255, { message: 'Le titre SEO ne peut pas dépasser 255 caractères' })
  seoTitle?: string;

  @ApiPropertyOptional({
    description: 'Description SEO (meta description)',
    example: 'Découvrez cette œuvre unique capturant un coucher de soleil sur Tokyo...',
  })
  @IsOptional()
  @IsString({ message: 'La description SEO doit être une chaîne de caractères' })
  seoDescription?: string;

  @ApiPropertyOptional({
    description: 'IDs des tags à associer',
    example: ['uuid-tag-japon', 'uuid-tag-paysage'],
    type: [String],
  })
  @IsOptional()
  @IsArray({ message: 'tagIds doit être un tableau' })
  @IsUUID('4', { each: true, message: 'Chaque tagId doit être un UUID valide' })
  tagIds?: string[];
}

// ========================================
// UPDATE — PATCH /products/:id
// ========================================
export class UpdateProductDto {
  @ApiPropertyOptional({
    description: "Nom de l'œuvre",
    example: 'Coucher de soleil sur Tokyo',
    maxLength: 255,
  })
  @IsOptional()
  @IsString({ message: 'Le nom doit être une chaîne de caractères' })
  @MaxLength(255, { message: 'Le nom ne peut pas dépasser 255 caractères' })
  name?: string;

  @ApiPropertyOptional({
    description: "Description complète de l'œuvre",
  })
  @IsOptional()
  @IsString({ message: 'La description doit être une chaîne de caractères' })
  description?: string;

  @ApiPropertyOptional({
    description: 'Description courte',
    maxLength: 500,
  })
  @IsOptional()
  @IsString({ message: 'La description courte doit être une chaîne de caractères' })
  @MaxLength(500, { message: 'La description courte ne peut pas dépasser 500 caractères' })
  shortDescription?: string;

  @ApiPropertyOptional({
    description: 'Statut du produit',
    enum: ProductStatus,
  })
  @IsOptional()
  @IsEnum(ProductStatus, { message: 'Le statut doit être DRAFT, PUBLISHED ou ARCHIVED' })
  status?: ProductStatus;

  @ApiPropertyOptional({
    description: 'Produit mis en avant ?',
  })
  @IsOptional()
  @IsBoolean({ message: 'featured doit être un booléen' })
  featured?: boolean;

  @ApiPropertyOptional({
    description: 'Titre SEO',
    maxLength: 255,
  })
  @IsOptional()
  @IsString({ message: 'Le titre SEO doit être une chaîne de caractères' })
  @MaxLength(255, { message: 'Le titre SEO ne peut pas dépasser 255 caractères' })
  seoTitle?: string;

  @ApiPropertyOptional({
    description: 'Description SEO',
  })
  @IsOptional()
  @IsString({ message: 'La description SEO doit être une chaîne de caractères' })
  seoDescription?: string;

  @ApiPropertyOptional({
    description: 'IDs des tags à associer (remplace les tags existants)',
    type: [String],
  })
  @IsOptional()
  @IsArray({ message: 'tagIds doit être un tableau' })
  @IsUUID('4', { each: true, message: 'Chaque tagId doit être un UUID valide' })
  tagIds?: string[];
}

// ========================================
// RESPONSE — Ce que l'API retourne
// ========================================
export class ProductResponseDto {
  @ApiProperty({
    description: 'Identifiant unique',
    example: 'edde52aa-3659-4177-9689-9cf45caaee78',
  })
  id!: string;

  @ApiProperty({
    description: "Nom de l'œuvre",
    example: 'Coucher de soleil sur Tokyo',
  })
  name!: string;

  @ApiProperty({
    description: 'Slug URL-friendly',
    example: 'coucher-de-soleil-sur-tokyo',
  })
  slug!: string;

  @ApiPropertyOptional({
    description: "Description complète de l'œuvre",
  })
  description?: string;

  @ApiPropertyOptional({
    description: 'Description courte',
  })
  shortDescription?: string;

  @ApiProperty({
    description: 'Statut du produit',
    enum: ProductStatus,
    example: ProductStatus.DRAFT,
  })
  status!: ProductStatus;

  @ApiProperty({
    description: 'Produit mis en avant ?',
    example: false,
  })
  featured!: boolean;

  @ApiPropertyOptional({
    description: 'Titre SEO',
  })
  seoTitle?: string;

  @ApiPropertyOptional({
    description: 'Description SEO',
  })
  seoDescription?: string;

  @ApiProperty({
    description: 'Tags associés',
    type: [TagResponseDto],
  })
  tags!: TagResponseDto[];

  @ApiProperty({
    description: 'Date de création',
    example: '2025-01-25T20:00:00.000Z',
  })
  createdAt!: Date;

  @ApiProperty({
    description: 'Date de modification',
    example: '2025-01-25T21:00:00.000Z',
  })
  updatedAt!: Date;
}
