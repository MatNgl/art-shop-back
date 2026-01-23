// src/modules/activity-logs/activity-log.controller.ts
import { Controller, Get, Query, UseGuards, Param, ParseUUIDPipe } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiParam } from '@nestjs/swagger';
import { ActivityLogService } from './activity-log.service';
import { JwtAuthGuard, RolesGuard } from '../auth/guards';
import { Roles } from '../auth/decorators';
import { ActorType, ActionType, EntityType, LogSeverity } from './entities/activity-log.entity';
import {
  GetActivityLogsQueryDto,
  PaginatedActivityLogsResponseDto,
  ActivityLogsFiltersDto,
  ActivityLogDto,
} from './dto';

@ApiTags("Logs d'activité")
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('SUPER_ADMIN', 'ADMIN')
@Controller('activity-logs')
export class ActivityLogController {
  constructor(private readonly activityLogService: ActivityLogService) {}

  /**
   * Récupère les logs d'activité avec filtres et pagination
   */
  @Get()
  @ApiOperation({
    summary: "Liste des logs d'activité",
    description: "Récupère les logs d'activité avec possibilité de filtrer et paginer. Réservé aux administrateurs.",
  })
  @ApiResponse({
    status: 200,
    description: "Liste paginée des logs d'activité",
    type: PaginatedActivityLogsResponseDto,
  })
  @ApiResponse({ status: 401, description: 'Non authentifié' })
  @ApiResponse({ status: 403, description: 'Accès refusé - Rôle insuffisant' })
  async findAll(@Query() query: GetActivityLogsQueryDto): Promise<PaginatedActivityLogsResponseDto> {
    const { page = 1, limit = 20, actorType, actorUserId, actionType, entityType, severity } = query;

    const { logs, total } = await this.activityLogService.findAll({
      page,
      limit,
      actorType,
      actorUserId,
      actionType,
      entityType,
      severity,
    });

    const totalPages = Math.ceil(total / limit);

    return {
      data: logs,
      meta: {
        page,
        limit,
        total,
        totalPages,
        hasNextPage: page < totalPages,
        hasPreviousPage: page > 1,
      },
    };
  }

  /**
   * Récupère les valeurs disponibles pour les filtres
   * Utile pour construire les selects dans le frontend
   */
  @Get('filters')
  @ApiOperation({
    summary: 'Valeurs des filtres disponibles',
    description: 'Retourne les valeurs possibles pour chaque filtre (utile pour les formulaires frontend)',
  })
  @ApiResponse({
    status: 200,
    description: 'Valeurs des filtres',
    type: ActivityLogsFiltersDto,
  })
  getAvailableFilters(): ActivityLogsFiltersDto {
    return {
      actorTypes: Object.values(ActorType),
      actionTypes: Object.values(ActionType),
      entityTypes: Object.values(EntityType),
      severities: Object.values(LogSeverity),
    };
  }

  /**
   * Récupère les logs d'un utilisateur spécifique
   */
  @Get('user/:userId')
  @ApiOperation({
    summary: "Logs d'un utilisateur",
    description: "Récupère tous les logs d'activité d'un utilisateur spécifique",
  })
  @ApiParam({
    name: 'userId',
    description: "UUID de l'utilisateur",
    example: 'edde52aa-3659-4177-9689-9cf45caaee78',
  })
  @ApiResponse({
    status: 200,
    description: "Liste des logs de l'utilisateur",
    type: [ActivityLogDto],
  })
  @ApiResponse({ status: 400, description: 'UUID invalide' })
  async findByUser(
    @Param('userId', ParseUUIDPipe) userId: string,
    @Query('limit') limit?: number,
  ): Promise<ActivityLogDto[]> {
    return this.activityLogService.findByUser(userId, limit ?? 50);
  }

  /**
   * Récupère les logs d'une entité spécifique
   */
  @Get('entity/:entityType/:entityId')
  @ApiOperation({
    summary: "Logs d'une entité",
    description: "Récupère tous les logs d'activité concernant une entité spécifique",
  })
  @ApiParam({
    name: 'entityType',
    description: "Type d'entité",
    enum: EntityType,
    example: EntityType.ORDER,
  })
  @ApiParam({
    name: 'entityId',
    description: "UUID de l'entité",
    example: 'edde52aa-3659-4177-9689-9cf45caaee78',
  })
  @ApiResponse({
    status: 200,
    description: "Liste des logs de l'entité",
    type: [ActivityLogDto],
  })
  async findByEntity(
    @Param('entityType') entityType: EntityType,
    @Param('entityId', ParseUUIDPipe) entityId: string,
    @Query('limit') limit?: number,
  ): Promise<ActivityLogDto[]> {
    return this.activityLogService.findByEntity(entityType, entityId, limit ?? 50);
  }
}
