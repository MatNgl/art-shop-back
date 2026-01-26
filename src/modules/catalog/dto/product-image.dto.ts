import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsEnum, IsInt, IsNotEmpty, IsOptional, IsString, IsUrl, MaxLength, Min } from 'class-validator';
import { ProductImageStatus } from '../entities/product-image.entity';

// ========================================
// CREATE — POST /products/:productId/images
// ========================================
export class CreateProductImageDto {
  @ApiProperty({
    description: "URL de l'image",
    example: 'https://cdn.artshop.com/images/coucher-soleil-tokyo.jpg',
  })
  @IsString({ message: "L'URL doit être une chaîne de caractères" })
  @IsNotEmpty({ message: "L'URL est obligatoire" })
  @IsUrl({}, { message: "L'URL doit être valide" })
  url!: string;

  @ApiPropertyOptional({
    description: 'Texte alternatif (accessibilité)',
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
  @IsOptional()
  @IsBoolean({ message: 'isPrimary doit être un booléen' })
  isPrimary?: boolean;
}

// ========================================
// UPDATE — PATCH /products/:productId/images/:imageId
// ========================================
export class UpdateProductImageDto {
  @ApiPropertyOptional({
    description: "URL de l'image",
    example: 'https://cdn.artshop.com/images/nouvelle-image.jpg',
  })
  @IsOptional()
  @IsString({ message: "L'URL doit être une chaîne de caractères" })
  @IsUrl({}, { message: "L'URL doit être valide" })
  url?: string;

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
  @IsBoolean({ message: 'isPrimary doit être un booléen' })
  isPrimary?: boolean;
}

// ========================================
// RESPONSE — Ce que l'API retourne
// ========================================
export class ProductImageResponseDto {
  @ApiProperty({
    description: 'Identifiant unique',
    example: 'edde52aa-3659-4177-9689-9cf45caaee78',
  })
  id!: string;

  @ApiProperty({
    description: 'ID du produit associé',
    example: 'abcd1234-5678-90ab-cdef-1234567890ab',
  })
  productId!: string;

  @ApiProperty({
    description: "URL de l'image",
    example: 'https://cdn.artshop.com/images/coucher-soleil-tokyo.jpg',
  })
  url!: string;

  @ApiPropertyOptional({
    description: 'Texte alternatif',
    example: 'Coucher de soleil sur la baie de Tokyo',
  })
  altText?: string;

  @ApiProperty({
    description: 'Position dans le carrousel',
    example: 0,
  })
  position!: number;

  @ApiProperty({
    description: "Statut de l'image",
    enum: ProductImageStatus,
    example: ProductImageStatus.ACTIVE,
  })
  status!: ProductImageStatus;

  @ApiProperty({
    description: 'Image principale ?',
    example: true,
  })
  isPrimary!: boolean;

  @ApiProperty({
    description: 'Date de création',
    example: '2025-01-25T20:00:00.000Z',
  })
  createdAt!: Date;
}
