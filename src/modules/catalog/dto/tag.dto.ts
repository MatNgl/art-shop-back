import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';

export class CreateTagDto {
  @ApiProperty({
    description: 'Nom du tag',
    example: 'Japon',
    maxLength: 100,
  })
  @IsString({ message: 'Le nom du tag doit être une chaîne de caractères' })
  @IsNotEmpty({ message: 'Le nom du tag ne peut pas être vide' })
  @MaxLength(100, { message: 'Le nom du tag ne peut pas dépasser 100 caractères' })
  name!: string;
}

export class UpdateTagDto {
  @ApiPropertyOptional({
    description: 'Nom du nouveau tag',
    example: 'Japon & Asie',
    maxLength: 100,
  })
  @IsOptional()
  @IsString({ message: 'Le nom du tag doit être une chaîne de caractères' })
  @MaxLength(100, { message: 'Le nom du tag ne peut pas dépasser 100 caractères' })
  name?: string;
}

export class TagResponseDto {
  @ApiProperty({
    description: 'ID du tag',
    example: 'edde52aa-3659-4177-9689-9cf45caaee78',
  })
  id!: string;

  @ApiProperty({
    description: 'Slug du tag',
    example: 'japon',
    maxLength: 100,
  })
  slug!: string;

  @ApiProperty({
    description: 'Date de création du tag',
    example: '2026-01-01T12:00:00Z',
  })
  createdAt!: Date;

  @ApiPropertyOptional({
    description: 'Date de modification',
    example: '2025-01-25T21:00:00.000Z',
  })
  updatedAt?: Date;
}
