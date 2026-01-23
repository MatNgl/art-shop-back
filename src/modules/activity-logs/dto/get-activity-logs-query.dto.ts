import { ApiPropertyOptional } from '@nestjs/swagger';
import { ActionType, ActorType, EntityType, LogSeverity } from '../entities/activity-log.entity';
import { IsEnum, IsInt, IsOptional, IsUUID, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';

export class GetActivityLogsQueryDto {
  @ApiPropertyOptional({
    description: "Type de l'acteur ayant effectué l'action",
    enum: ActorType,
    example: ActorType.USER,
  })
  @IsOptional()
  @IsEnum(ActorType, { message: "Le type d'acteur doit être une valeur valide." })
  actorType?: ActorType;

  @ApiPropertyOptional({
    description: "UUID de l'utilisateur acteur",
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @IsOptional()
  @IsUUID('4', { message: "L'ID de l'utilisateur acteur doit être un UUID valide." })
  actorUserId?: string;

  @ApiPropertyOptional({
    description: "Types d'action effectuées",
    enum: ActionType,
    example: ActionType.USER_LOGIN,
  })
  @IsOptional()
  @IsEnum(ActionType, { message: "Le type d'action doit être une valeur valide." })
  actionType?: ActionType;

  @ApiPropertyOptional({
    description: "Type d'entité concernée par l'action",
    enum: EntityType,
    example: EntityType.USER,
  })
  @IsOptional()
  @IsEnum(EntityType, { message: "Le type d'entité doit être une valeur valide." })
  entityType?: EntityType;

  @ApiPropertyOptional({
    description: 'Niveau de sévérité du log',
    enum: LogSeverity,
    example: LogSeverity.INFO,
  })
  @IsOptional()
  @IsEnum(LogSeverity, { message: 'Le niveau de sévérité doit être une valeur valide.' })
  severity?: LogSeverity;

  @ApiPropertyOptional({
    description: 'Numéro de page (commence à 1)',
    minimum: 1,
    default: 1,
    example: 1,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'La page doit être un entier' })
  @Min(1, { message: 'La page doit être au minimum 1' })
  page?: number = 1;

  @ApiPropertyOptional({
    description: "Nombre d'éléments par page",
    minimum: 1,
    maximum: 100,
    default: 20,
    example: 20,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'La limite doit être un entier' })
  @Min(1, { message: 'La limite doit être au minimum 1' })
  @Max(100, { message: 'La limite ne peut pas dépasser 100' })
  limit?: number = 20;
}
