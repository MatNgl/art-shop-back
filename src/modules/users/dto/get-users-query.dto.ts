import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsEnum, IsString, IsInt, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';
import { UserStatus } from '../entities/user.entity';

export class GetUsersQueryDto {
  @ApiPropertyOptional({
    description: 'Recherche par email',
    example: 'matt@example.com',
  })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({
    description: 'Filtrer par code de rôle',
    example: 'USER',
    enum: ['SUPER_ADMIN', 'ADMIN', 'USER', 'GUEST'],
  })
  @IsOptional()
  @IsString()
  roleCode?: string;

  @ApiPropertyOptional({
    description: 'Filtrer par statut',
    enum: UserStatus,
    example: UserStatus.ACTIVE,
  })
  @IsOptional()
  @IsEnum(UserStatus, { message: 'Le statut doit être une valeur valide' })
  status?: UserStatus;

  @ApiPropertyOptional({
    description: 'Numéro de page (commence à 1)',
    minimum: 1,
    default: 1,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({
    description: "Nombre d'éléments par page",
    minimum: 1,
    maximum: 100,
    default: 20,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 20;

  @ApiPropertyOptional({
    description: 'Champ de tri',
    enum: ['createdAt', 'email', 'lastName', 'lastLoginAt'],
    default: 'createdAt',
  })
  @IsOptional()
  @IsString()
  sortBy?: 'createdAt' | 'email' | 'lastName' | 'lastLoginAt' = 'createdAt';

  @ApiPropertyOptional({
    description: 'Ordre de tri',
    enum: ['ASC', 'DESC'],
    default: 'DESC',
  })
  @IsOptional()
  @IsEnum(['ASC', 'DESC'])
  sortOrder?: 'ASC' | 'DESC' = 'DESC';
}
