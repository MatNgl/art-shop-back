import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsInt, IsNotEmpty, IsNumber, IsOptional, IsUUID, Min } from 'class-validator';
import { ProductVariantStatus } from '../entities/product-variant.entity';
import { FormatResponseDto } from './format.dto';
import { MaterialResponseDto } from './material.dto';

// ========================================
// CREATE — POST /products/:productId/variants
// ========================================
export class CreateProductVariantDto {
  @ApiProperty({
    description: 'ID du format',
    example: '23945a01-979e-4b3c-b3ff-b8ac0bb90db4',
  })
  @IsUUID('4', { message: 'formatId doit être un UUID valide' })
  @IsNotEmpty({ message: 'Le format est obligatoire' })
  formatId!: string;

  @ApiProperty({
    description: 'ID du matériau',
    example: '954595d8-42fd-4092-8729-d8cc8b562542',
  })
  @IsUUID('4', { message: 'materialId doit être un UUID valide' })
  @IsNotEmpty({ message: 'Le matériau est obligatoire' })
  materialId!: string;

  @ApiProperty({
    description: 'Prix en euros',
    example: 49.99,
  })
  @IsNumber({}, { message: 'Le prix doit être un nombre' })
  @Min(0, { message: 'Le prix doit être positif' })
  price!: number;

  @ApiPropertyOptional({
    description: 'Quantité en stock',
    example: 10,
    default: 0,
  })
  @IsOptional()
  @IsInt({ message: 'Le stock doit être un entier' })
  @Min(0, { message: 'Le stock doit être positif' })
  stockQty?: number;

  @ApiPropertyOptional({
    description: 'Statut de la variante',
    enum: ProductVariantStatus,
    default: ProductVariantStatus.AVAILABLE,
  })
  @IsOptional()
  @IsEnum(ProductVariantStatus, {
    message: 'Le statut doit être AVAILABLE, OUT_OF_STOCK ou DISCONTINUED',
  })
  status?: ProductVariantStatus;
}

// ========================================
// UPDATE — PATCH /products/:productId/variants/:variantId
// ========================================
export class UpdateProductVariantDto {
  @ApiPropertyOptional({
    description: 'ID du format',
  })
  @IsOptional()
  @IsUUID('4', { message: 'formatId doit être un UUID valide' })
  formatId?: string;

  @ApiPropertyOptional({
    description: 'ID du matériau',
  })
  @IsOptional()
  @IsUUID('4', { message: 'materialId doit être un UUID valide' })
  materialId?: string;

  @ApiPropertyOptional({
    description: 'Prix en euros',
    example: 59.99,
  })
  @IsOptional()
  @IsNumber({}, { message: 'Le prix doit être un nombre' })
  @Min(0, { message: 'Le prix doit être positif' })
  price?: number;

  @ApiPropertyOptional({
    description: 'Quantité en stock',
    example: 5,
  })
  @IsOptional()
  @IsInt({ message: 'Le stock doit être un entier' })
  @Min(0, { message: 'Le stock doit être positif' })
  stockQty?: number;

  @ApiPropertyOptional({
    description: 'Statut de la variante',
    enum: ProductVariantStatus,
  })
  @IsOptional()
  @IsEnum(ProductVariantStatus, {
    message: 'Le statut doit être AVAILABLE, OUT_OF_STOCK ou DISCONTINUED',
  })
  status?: ProductVariantStatus;
}

// ========================================
// UPDATE STOCK — PATCH /products/:productId/variants/:id/stock
// ========================================
export class UpdateStockDto {
  @ApiProperty({
    description: 'Changement de quantité (+10 pour ajouter, -5 pour retirer)',
    example: -2,
  })
  @IsInt({ message: 'La quantité doit être un entier' })
  @IsNotEmpty({ message: 'La quantité est obligatoire' })
  quantityChange!: number;
}

// ========================================
// RESPONSE — Ce que l'API retourne
// ========================================
export class ProductVariantResponseDto {
  @ApiProperty({
    description: 'Identifiant unique',
    example: 'edde52aa-3659-4177-9689-9cf45caaee78',
  })
  id!: string;

  @ApiProperty({
    description: 'ID du produit',
    example: 'abcd1234-5678-90ab-cdef-1234567890ab',
  })
  productId!: string;

  @ApiProperty({
    description: 'Format de la variante',
    type: FormatResponseDto,
  })
  format!: FormatResponseDto;

  @ApiProperty({
    description: 'Matériau de la variante',
    type: MaterialResponseDto,
  })
  material!: MaterialResponseDto;

  @ApiProperty({
    description: 'Prix en euros',
    example: 49.99,
  })
  price!: number;

  @ApiProperty({
    description: 'Quantité en stock',
    example: 10,
  })
  stockQty!: number;

  @ApiProperty({
    description: 'Statut de la variante',
    enum: ProductVariantStatus,
    example: ProductVariantStatus.AVAILABLE,
  })
  status!: ProductVariantStatus;

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
