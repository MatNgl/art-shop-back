import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ActorType, ActionType, EntityType, LogSeverity } from '../entities/activity-log.entity';

// DTO pour l'utilisateur acteur (relation)
class ActorUserDto {
  @ApiProperty({ example: 'edde52aa-3659-4177-9689-9cf45caaee78' })
  id!: string;

  @ApiProperty({ example: 'user@example.com' })
  email!: string;

  @ApiPropertyOptional({ example: 'John' })
  firstName?: string;

  @ApiPropertyOptional({ example: 'Doe' })
  lastName?: string;
}

// DTO pour un log d'activité individuel
export class ActivityLogDto {
  @ApiProperty({
    description: 'Identifiant unique du log',
    example: 'edde52aa-3659-4177-9689-9cf45caaee78',
  })
  id!: string;

  @ApiProperty({
    description: "Type d'acteur",
    enum: ActorType,
    example: ActorType.USER,
  })
  actorType!: ActorType;

  @ApiPropertyOptional({
    description: "UUID de l'utilisateur acteur",
    example: 'edde52aa-3659-4177-9689-9cf45caaee78',
  })
  actorUserId?: string;

  @ApiPropertyOptional({
    description: "Détails de l'utilisateur acteur",
    type: ActorUserDto,
  })
  actorUser?: ActorUserDto;

  @ApiProperty({
    description: "Type d'action effectuée",
    enum: ActionType,
    example: ActionType.USER_LOGIN,
  })
  actionType!: ActionType;

  @ApiProperty({
    description: "Type d'entité concernée",
    enum: EntityType,
    example: EntityType.USER,
  })
  entityType!: EntityType;

  @ApiPropertyOptional({
    description: "UUID de l'entité concernée",
    example: 'edde52aa-3659-4177-9689-9cf45caaee78',
  })
  entityId?: string;

  @ApiProperty({
    description: 'Niveau de sévérité',
    enum: LogSeverity,
    example: LogSeverity.INFO,
  })
  severity!: LogSeverity;

  @ApiProperty({
    description: 'Métadonnées additionnelles (JSON)',
    example: { email: 'user@example.com', authProvider: 'LOCAL' },
  })
  metadata!: Record<string, unknown>;

  @ApiProperty({
    description: 'Date de création du log',
    example: '2025-01-23T10:30:00.000Z',
  })
  createdAt!: Date;
}

// DTO pour la pagination
class PaginationMetaDto {
  @ApiProperty({ description: 'Page actuelle', example: 1 })
  page!: number;

  @ApiProperty({ description: "Nombre d'éléments par page", example: 20 })
  limit!: number;

  @ApiProperty({ description: "Nombre total d'éléments", example: 150 })
  total!: number;

  @ApiProperty({ description: 'Nombre total de pages', example: 8 })
  totalPages!: number;

  @ApiProperty({ description: 'Y a-t-il une page suivante ?', example: true })
  hasNextPage!: boolean;

  @ApiProperty({ description: 'Y a-t-il une page précédente ?', example: false })
  hasPreviousPage!: boolean;
}

// DTO pour la réponse paginée
export class PaginatedActivityLogsResponseDto {
  @ApiProperty({
    description: "Liste des logs d'activité",
    type: [ActivityLogDto],
  })
  data!: ActivityLogDto[];

  @ApiProperty({
    description: 'Métadonnées de pagination',
    type: PaginationMetaDto,
  })
  meta!: PaginationMetaDto;
}

// DTO pour les valeurs des filtres disponibles (utile pour le frontend)
export class ActivityLogsFiltersDto {
  @ApiProperty({
    description: "Types d'acteurs disponibles",
    enum: ActorType,
    isArray: true,
  })
  actorTypes!: ActorType[];

  @ApiProperty({
    description: "Types d'actions disponibles",
    enum: ActionType,
    isArray: true,
  })
  actionTypes!: ActionType[];

  @ApiProperty({
    description: "Types d'entités disponibles",
    enum: EntityType,
    isArray: true,
  })
  entityTypes!: EntityType[];

  @ApiProperty({
    description: 'Niveaux de sévérité disponibles',
    enum: LogSeverity,
    isArray: true,
  })
  severities!: LogSeverity[];
}
