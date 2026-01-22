import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ActivityLog, ActorType, ActionType, EntityType, LogSeverity } from './entities/activity-log.entity';

/**
 * Interface pour créer un log d'activité
 */
export interface CreateActivityLogDto {
  actorType: ActorType;
  actorUserId?: string;
  actionType: ActionType;
  entityType: EntityType;
  entityId?: string;
  severity?: LogSeverity;
  metadata?: Record<string, unknown>;
}

@Injectable()
export class ActivityLogService {
  constructor(
    @InjectRepository(ActivityLog)
    private readonly activityLogRepository: Repository<ActivityLog>,
  ) {}

  /**
   * Enregistre un log d'activité
   * Cette méthode ne doit jamais lever d'exception pour ne pas impacter le flux principal
   */
  async log(data: CreateActivityLogDto): Promise<ActivityLog | null> {
    try {
      const log = this.activityLogRepository.create({
        ...data,
        severity: data.severity ?? LogSeverity.INFO,
        metadata: data.metadata ?? {},
      });

      return await this.activityLogRepository.save(log);
    } catch (error) {
      // Log l'erreur en console mais ne propage pas l'exception
      // pour ne pas impacter le flux métier principal
      console.error("Erreur lors de l'enregistrement du log d'activité:", error);
      return null;
    }
  }

  /**
   * Raccourci pour logger une action utilisateur
   */
  async logUserAction(
    userId: string,
    actionType: ActionType,
    metadata?: Record<string, unknown>,
  ): Promise<ActivityLog | null> {
    return this.log({
      actorType: ActorType.USER,
      actorUserId: userId,
      actionType,
      entityType: EntityType.USER,
      entityId: userId,
      metadata,
    });
  }

  /**
   * Raccourci pour logger une erreur
   */
  async logError(
    actionType: ActionType,
    entityType: EntityType,
    metadata?: Record<string, unknown>,
    actorUserId?: string,
  ): Promise<ActivityLog | null> {
    return this.log({
      actorType: actorUserId ? ActorType.USER : ActorType.SYSTEM,
      actorUserId,
      actionType,
      entityType,
      severity: LogSeverity.ERROR,
      metadata,
    });
  }

  /**
   * Récupère les logs avec pagination
   */
  async findAll(options?: {
    page?: number;
    limit?: number;
    actionType?: ActionType;
    entityType?: EntityType;
    actorUserId?: string;
    severity?: LogSeverity;
  }): Promise<{ logs: ActivityLog[]; total: number }> {
    const page = options?.page ?? 1;
    const limit = options?.limit ?? 50;
    const skip = (page - 1) * limit;

    const queryBuilder = this.activityLogRepository
      .createQueryBuilder('log')
      .leftJoinAndSelect('log.actorUser', 'user')
      .orderBy('log.createdAt', 'DESC');

    if (options?.actionType) {
      queryBuilder.andWhere('log.actionType = :actionType', {
        actionType: options.actionType,
      });
    }

    if (options?.entityType) {
      queryBuilder.andWhere('log.entityType = :entityType', {
        entityType: options.entityType,
      });
    }

    if (options?.actorUserId) {
      queryBuilder.andWhere('log.actorUserId = :actorUserId', {
        actorUserId: options.actorUserId,
      });
    }

    if (options?.severity) {
      queryBuilder.andWhere('log.severity = :severity', {
        severity: options.severity,
      });
    }

    const [logs, total] = await queryBuilder.skip(skip).take(limit).getManyAndCount();

    return { logs, total };
  }

  /**
   * Récupère les logs d'un utilisateur spécifique
   */
  async findByUser(userId: string, limit = 50): Promise<ActivityLog[]> {
    return this.activityLogRepository.find({
      where: { actorUserId: userId },
      order: { createdAt: 'DESC' },
      take: limit,
    });
  }

  /**
   * Récupère les logs d'une entité spécifique
   */
  async findByEntity(entityType: EntityType, entityId: string, limit = 50): Promise<ActivityLog[]> {
    return this.activityLogRepository.find({
      where: { entityType, entityId },
      order: { createdAt: 'DESC' },
      take: limit,
      relations: ['actorUser'],
    });
  }
}
