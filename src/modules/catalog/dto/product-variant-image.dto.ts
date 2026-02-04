import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsEnum, IsInt, IsOptional, IsString, MaxLength, Min } from 'class-validator';
import { ProductVariantImageStatus } from '../entities/product-variant-image.entity';
import { Expose, Transform, Type } from 'class-transformer';
import { ImageUrlsDto } from './product-image.dto';

// CREATE — POST /products/:productId/variants/:variantId/images

/**
 * DTO pour l'upload d'une image de variante.
 * Le fichier est envoyé via multipart/form-data (géré par Multer).
 * L'URL et le publicId sont générés par Cloudinary.
 */
export class CreateProductVariantImageDto {
  @ApiPropertyOptional({
    description: 'Texte alternatif (accessibilité & SEO)',
    example: 'Impression sur toile format A3',
    maxLength: 255,
  })
  @IsOptional()
  @IsString({ message: 'Le texte alternatif doit être une chaîne de caractères' })
  @MaxLength(255, { message: 'Le texte alternatif ne peut pas dépasser 255 caractères' })
  altText?: string;

  @ApiPropertyOptional({
    description: 'Position dans le carrousel (0 = première)',
    example: 0,
    default: 0,
  })
  @IsOptional()
  @Transform(({ value }) => parseInt(value, 10))
  @IsInt({ message: 'La position doit être un entier' })
  @Min(0, { message: 'La position doit être positive' })
  position?: number;

  @ApiPropertyOptional({
    description: "Statut de l'image",
    enum: ProductVariantImageStatus,
    default: ProductVariantImageStatus.ACTIVE,
  })
  @IsOptional()
  @IsEnum(ProductVariantImageStatus, { message: 'Le statut doit être ACTIVE ou INACTIVE' })
  status?: ProductVariantImageStatus;

  @ApiPropertyOptional({
    description: 'Image principale de la variante ?',
    default: false,
  })
  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true)
  @IsBoolean({ message: 'isPrimary doit être un booléen' })
  isPrimary?: boolean;
}

// UPDATE — PATCH /products/:productId/variants/:variantId/images/:imageId

/**
 * DTO pour la mise à jour des métadonnées d'une image de variante.
 * Le fichier ne peut pas être modifié (supprimer + re-uploader si besoin).
 */
export class UpdateProductVariantImageDto {
  @ApiPropertyOptional({
    description: 'Texte alternatif',
    maxLength: 255,
  })
  @IsOptional()
  @IsString({ message: 'Le texte alternatif doit être une chaîne de caractères' })
  @MaxLength(255, { message: 'Le texte alternatif ne peut pas dépasser 255 caractères' })
  altText?: string;

  @ApiPropertyOptional({
    description: 'Position dans le carrousel',
  })
  @IsOptional()
  @Transform(({ value }) => parseInt(value, 10))
  @IsInt({ message: 'La position doit être un entier' })
  @Min(0, { message: 'La position doit être positive' })
  position?: number;

  @ApiPropertyOptional({
    description: "Statut de l'image",
    enum: ProductVariantImageStatus,
  })
  @IsOptional()
  @IsEnum(ProductVariantImageStatus, { message: 'Le statut doit être ACTIVE ou INACTIVE' })
  status?: ProductVariantImageStatus;

  @ApiPropertyOptional({
    description: 'Image principale de la variante ?',
  })
  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true)
  @IsBoolean({ message: 'isPrimary doit être un booléen' })
  isPrimary?: boolean;
}

// RESPONSE

/**
 * DTO de réponse pour une image de variante.
 */
export class ProductVariantImageResponseDto {
  @ApiProperty({
    description: 'Identifiant unique',
    example: 'edde52aa-3659-4177-9689-9cf45caaee78',
  })
  @Expose()
  id!: string;

  @ApiProperty({
    description: 'ID de la variante associée',
    example: 'abcd1234-5678-90ab-cdef-1234567890ab',
  })
  @Expose()
  variantId!: string;

  @ApiProperty({
    description: 'Identifiant Cloudinary (pour suppression/transformation)',
    example: 'art-shop/products/mon-produit/variants/abc123/render',
  })
  @Expose()
  publicId!: string;

  @ApiProperty({
    description: 'URL de base HTTPS',
    example: 'https://res.cloudinary.com/demo/image/upload/art-shop/products/mon-produit/variants/abc123/render.jpg',
  })
  @Expose()
  url!: string;

  @ApiProperty({
    description: 'URLs dans toutes les tailles',
    type: ImageUrlsDto,
  })
  @Expose()
  @Type(() => ImageUrlsDto)
  urls!: ImageUrlsDto;

  @ApiPropertyOptional({
    description: 'Texte alternatif',
    example: 'Impression sur toile format A3',
  })
  @Expose()
  altText?: string;

  @ApiProperty({
    description: 'Position dans le carrousel',
    example: 0,
  })
  @Expose()
  position!: number;

  @ApiProperty({
    description: "Statut de l'image",
    enum: ProductVariantImageStatus,
    example: ProductVariantImageStatus.ACTIVE,
  })
  @Expose()
  status!: ProductVariantImageStatus;

  @ApiProperty({
    description: 'Image principale de la variante ?',
    example: true,
  })
  @Expose()
  isPrimary!: boolean;

  @ApiProperty({
    description: 'Date de création',
    example: '2025-01-25T20:00:00.000Z',
  })
  @Expose()
  createdAt!: Date;

  @ApiProperty({
    description: "ID de l'utilisateur ayant uploadé",
    example: '123e4567-e89b-12d3-a456-426614174002',
  })
  @Expose()
  createdById!: string;
}
