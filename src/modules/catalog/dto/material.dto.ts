import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';

export class CreateMaterialDto {
  @ApiProperty({
    description: 'Nom du matériau',
    example: 'Toile',
    maxLength: 50,
  })
  @IsString({ message: 'Le nom du matériau doit être une chaîne de caractères' })
  @IsNotEmpty({ message: 'Le nom du matériau ne peut pas être vide' })
  @MaxLength(50, { message: 'Le nom du matériau ne peut pas dépasser 50 caractères' })
  name!: string;

  @ApiPropertyOptional({
    description: 'Description du matériau',
    example: 'Matériau utilisé pour les impressions de haute qualité.',
  })
  @IsOptional()
  @IsString({ message: 'La description doit être une chaîne de caractères' })
  description?: string;

  @ApiPropertyOptional({
    description: 'Indique si le matériau est actif',
    example: true,
  })
  @IsOptional()
  @IsBoolean({ message: 'isActive doit être un booléen' })
  isActive?: boolean;
}

export class UpdateMaterialDto {
  @ApiPropertyOptional({
    description: 'Nom du nouveau matériau',
    example: 'Papier',
    maxLength: 50,
  })
  @IsOptional()
  @IsString({ message: 'Le nom du matériau doit être une chaîne de caractères' })
  @MaxLength(50, { message: 'Le nom du matériau ne peut pas dépasser 50 caractères' })
  name?: string;

  @ApiPropertyOptional({
    description: 'Description du matériau',
    example: 'Matériau utilisé pour les impressions de haute qualité.',
  })
  @IsOptional()
  @IsString({ message: 'La description doit être une chaîne de caractères' })
  description?: string;

  @ApiPropertyOptional({
    description: 'Activer/désactiver le matériau',
    example: false,
  })
  @IsOptional()
  @IsBoolean({ message: 'isActive doit être un booléen' })
  isActive?: boolean;
}

export class MaterialResponseDto {
  @ApiProperty({
    description: 'ID du matériau',
    example: 'edde52aa-3659-4177-9689-9cf45caaee78',
  })
  id!: string;

  @ApiProperty({
    description: 'Nom du matériau',
    example: 'Toile',
  })
  name!: string;

  @ApiPropertyOptional({
    description: 'Description du matériau',
    example: 'Matériau utilisé pour les impressions de haute qualité.',
  })
  description?: string;

  @ApiProperty({
    description: 'Indique si le matériau est actif',
    example: true,
  })
  isActive!: boolean;

  @ApiProperty({
    description: 'Date de création du matériau',
    example: '2026-01-01T12:00:00Z',
  })
  createdAt!: Date;

  @ApiProperty({
    description: 'Date de modification',
    example: '2025-01-25T21:00:00.000Z',
  })
  updatedAt!: Date;
}
