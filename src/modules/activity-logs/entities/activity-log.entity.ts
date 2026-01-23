import { User } from '../../users/entities/user.entity';
import { Column, CreateDateColumn, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';

// Types d'acteur qui a effectué une action
export enum ActorType {
  USER = 'USER', // Utilisateur connecté
  GUEST = 'GUEST', // Visiteur non connecté
  SYSTEM = 'SYSTEM', // Action automatique du système
  ADMIN = 'ADMIN', // Action administrative
  SUPERADMIN = 'SUPERADMIN', // Action super-administrative
}

// Niveau de sévérité du log

export enum LogSeverity {
  INFO = 'INFO', // Information générale
  WARNING = 'WARNING', // Avertissement
  ERROR = 'ERROR', // Erreur critique
}

// Type d'actions loggées dans le système
export enum ActionType {
  // Auth
  USER_REGISTERED = 'USER_REGISTERED',
  USER_LOGIN = 'USER_LOGIN',
  USER_LOGIN_FAILED = 'USER_LOGIN_FAILED',
  USER_LOGOUT = 'USER_LOGOUT',
  GOOGLE_AUTH_SUCCESS = 'GOOGLE_AUTH_SUCCESS',
  PASSWORD_RESET_REQUESTED = 'PASSWORD_RESET_REQUESTED',
  PASSWORD_RESET_COMPLETED = 'PASSWORD_RESET_COMPLETED',

  // Gestion des utilisateurs
  USER_UPDATED = 'USER_UPDATED',
  USER_STATUS_CHANGED = 'USER_STATUS_CHANGED',
  USER_DELETED = 'USER_DELETED',
}

// Types d'entités concernées par les logs
export enum EntityType {
  USER = 'USER',
  CART = 'CART',
  ORDER = 'ORDER',
  PAYMENT = 'PAYMENT',
  PRODUCT = 'PRODUCT',
  PROMOTION = 'PROMOTION',
  SYSTEM = 'SYSTEM',
}

@Entity('activity_logs')
export class ActivityLog {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({
    name: 'actor_type',
    type: 'varchar',
    length: 50,
  })
  actorType!: ActorType;

  @Column({
    name: 'actor_user_id',
    type: 'uuid',
    nullable: true,
  })
  actorUserId!: string;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'actor_user_id' })
  actorUser?: User;

  @Column({
    name: 'action_type',
    type: 'varchar',
    length: 100,
  })
  actionType!: ActionType;

  @Column({
    name: 'entity_type',
    type: 'varchar',
    length: 100,
  })
  entityType!: EntityType;

  @Column({
    name: 'entity_id',
    type: 'uuid',
    nullable: true,
  })
  entityId?: string;

  @Column({
    type: 'varchar',
    length: 30,
    default: LogSeverity.INFO,
  })
  severity!: LogSeverity;

  @Column({
    type: 'jsonb',
    default: {},
  })
  metadata!: Record<string, unknown>;

  @CreateDateColumn({
    name: 'created_at',
  })
  createdAt!: Date;
}
