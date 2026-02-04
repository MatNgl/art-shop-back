import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsEnum, IsInt, IsOptional, IsString, MaxLength, Min } from 'class-validator';
import { ProductImageStatus } from '../entities/product-image.entity';
import { Expose, Transform, Type } from 'class-transformer';

/**
 * DTO pour l'upload d'une image de produit.
 * Le fichier est envoyé via multipart/form-data (géré par Multer).
 * L'URL et le publicId sont générés par Cloudinary.
 */
export class CreateProductImageDto {
  @ApiPropertyOptional({
    description: 'Texte alternatif (accessibilité & SEO)',
    example: 'Coucher de soleil sur la baie de Tokyo',
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
    enum: ProductImageStatus,
    default: ProductImageStatus.ACTIVE,
  })
  @IsOptional()
  @IsEnum(ProductImageStatus, { message: 'Le statut doit être ACTIVE ou INACTIVE' })
  status?: ProductImageStatus;

  @ApiPropertyOptional({
    description: 'Image principale du produit ?',
    default: false,
  })
  @Transform(({ value }) => value === 'true' || value === true)
  @IsOptional()
  @IsBoolean({ message: 'isPrimary doit être un booléen' })
  isPrimary?: boolean;
}

/**
 * DTO pour la mise à jour des métadonnées d'une image.
 * Le fichier ne peut pas être modifié (supprimer + re-uploader si besoin).
 */
export class UpdateProductImageDto {
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
    enum: ProductImageStatus,
  })
  @IsOptional()
  @IsEnum(ProductImageStatus, { message: 'Le statut doit être ACTIVE ou INACTIVE' })
  status?: ProductImageStatus;

  @ApiPropertyOptional({
    description: 'Image principale du produit ?',
  })
  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true)
  @IsBoolean({ message: 'isPrimary doit être un booléen' })
  isPrimary?: boolean;
}

// ========================================
// RESPONSE - URLs transformées
// ========================================
export class ImageUrlsDto {
  @ApiProperty({ example: 'https://res.cloudinary.com/.../w_150,h_150/image.jpg' })
  @Expose()
  thumbnail!: string;

  @ApiProperty({ example: 'https://res.cloudinary.com/.../w_300,h_300/image.jpg' })
  @Expose()
  small!: string;

  @ApiProperty({ example: 'https://res.cloudinary.com/.../w_600,h_600/image.jpg' })
  @Expose()
  medium!: string;

  @ApiProperty({ example: 'https://res.cloudinary.com/.../w_1200,h_1200/image.jpg' })
  @Expose()
  large!: string;

  @ApiProperty({ example: 'https://res.cloudinary.com/.../q_auto/image.jpg' })
  @Expose()
  original!: string;
}

/**
 * DTO de réponse pour une image de produit.
 */
export class ProductImageResponseDto {
  @ApiProperty({
    description: 'Identifiant unique',
    example: 'edde52aa-3659-4177-9689-9cf45caaee78',
  })
  @Expose()
  id!: string;

  @ApiProperty({
    description: 'ID du produit associé',
    example: 'abcd1234-5678-90ab-cdef-1234567890ab',
  })
  @Expose()
  productId!: string;

  @ApiProperty({
    description: 'Identifiant Cloudinary (pour suppression/transformation)',
    example: 'art-shop/products/mon-produit/main',
  })
  @Expose()
  publicId!: string;

  @ApiProperty({
    description: 'URL de base HTTPS',
    example: 'https://res.cloudinary.com/demo/image/upload/art-shop/products/mon-produit/main.jpg',
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
    example: 'Coucher de soleil sur la baie de Tokyo',
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
    enum: ProductImageStatus,
    example: ProductImageStatus.ACTIVE,
  })
  @Expose()
  status!: ProductImageStatus;

  @ApiProperty({
    description: 'Image principale ?',
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
