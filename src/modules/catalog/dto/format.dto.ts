import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsNotEmpty, IsNumber, IsOptional, IsString, MaxLength, Min } from 'class-validator';

export class CreateFormatDto {
  @ApiProperty({
    description: 'Nom du format',
    example: 'A4',
    maxLength: 50,
  })
  @IsString({ message: 'Le nom du format doit être une chaîne de caractères' })
  @IsNotEmpty({ message: 'Le nom du format ne peut pas être vide' })
  @MaxLength(50, { message: 'Le nom du format ne peut pas dépasser 50 caractères' })
  name!: string;

  @ApiProperty({
    description: 'Largeur du format en millimètres',
    example: 210,
  })
  @IsNumber({}, { message: 'La largeur doit être un nombre' })
  @Min(1, { message: 'La largeur doit être au moins de 1 mm' })
  widthMm!: number;

  @ApiProperty({
    description: 'Hauteur du format en millimètres',
    example: 297,
  })
  @IsNumber({}, { message: 'La hauteur doit être un nombre' })
  @Min(1, { message: 'La hauteur doit être au moins de 1 mm' })
  heightMm!: number;

  @ApiProperty({
    description: 'Indique si le format est personnalisé',
    example: false,
    default: false,
  })
  @IsOptional()
  @IsBoolean({ message: 'isCustom doit être un booléen' })
  isCustom?: boolean;
}

export class UpdateFormatDto {
  @ApiProperty({
    description: 'Nom du format',
    example: 'A4',
    maxLength: 50,
  })
  @IsOptional()
  @IsString({ message: 'Le nom du format doit être une chaîne de caractères' })
  @MaxLength(50, { message: 'Le nom du format ne peut pas dépasser 50 caractères' })
  name?: string;

  @ApiProperty({
    description: 'Largeur du format en millimètres',
    example: 210,
  })
  @IsOptional()
  @IsNumber({}, { message: 'La largeur doit être un nombre' })
  @Min(1, { message: 'La largeur doit être au moins de 1 mm' })
  widthMm?: number;

  @ApiProperty({
    description: 'Hauteur du format en millimètres',
    example: 297,
  })
  @IsOptional()
  @IsNumber({}, { message: 'La hauteur doit être un nombre' })
  @Min(1, { message: 'La hauteur doit être au moins de 1 mm' })
  heightMm?: number;

  @ApiProperty({
    description: 'Indique si le format est personnalisé',
    example: false,
  })
  @IsOptional()
  @IsBoolean({ message: 'isCustom doit être un booléen' })
  isCustom?: boolean;
}

export class FormatResponseDto {
  @ApiProperty({
    description: 'Identifiant unique du format',
    example: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
  })
  id!: string;

  @ApiProperty({
    description: 'Nom du format',
    example: 'A4',
  })
  name!: string;

  @ApiProperty({
    description: 'Largeur du format en millimètres',
    example: 210,
  })
  widthMm!: number;

  @ApiProperty({
    description: 'Hauteur du format en millimètres',
    example: 297,
  })
  heightMm!: number;

  @ApiProperty({
    description: 'Indique si le format est personnalisé',
    example: false,
  })
  isCustom!: boolean;

  @ApiProperty({
    description: 'Date de création du format',
    example: '2023-10-05T14:48:00.000Z',
  })
  createdAt!: Date;

  @ApiProperty({
    description: 'Date de la dernière modification du format',
    example: '2023-10-10T10:20:30.000Z',
  })
  updatedAt!: Date;
}
