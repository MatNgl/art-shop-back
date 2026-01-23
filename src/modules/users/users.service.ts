// src/modules/users/users.service.ts
import {
  Injectable,
  NotFoundException,
  ConflictException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User, UserStatus } from './entities/user.entity';
import { Role } from '../roles/entities/role.entity';
import { ActivityLogService, ActorType, ActionType, EntityType, LogSeverity } from '../activity-logs';
import { GetUsersQueryDto, UpdateUserDto, UpdateUserStatusDto, UsersStatsDto } from './dto';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(Role)
    private readonly roleRepository: Repository<Role>,
    private readonly activityLogService: ActivityLogService,
  ) {}

  // Récupère tous les utilisateurs avec pagination et filtres
  async findAll(query: GetUsersQueryDto): Promise<{ users: User[]; total: number }> {
    const { page = 1, limit = 20, search, roleCode, status, sortBy = 'createdAt', sortOrder = 'DESC' } = query;

    const skip = (page - 1) * limit;

    const queryBuilder = this.userRepository
      .createQueryBuilder('user')
      .leftJoinAndSelect('user.role', 'role')
      .select([
        'user.id',
        'user.email',
        'user.firstName',
        'user.lastName',
        'user.displayName',
        'user.phone',
        'user.status',
        'user.authProvider',
        'user.avatarUrl',
        'user.lastLoginAt',
        'user.createdAt',
        'user.updatedAt',
        'role.id',
        'role.code',
        'role.label',
      ]);

    // Filtre par recherche (email, prénom, nom)
    if (search) {
      queryBuilder.andWhere(
        '(user.email ILIKE :search OR user.firstName ILIKE :search OR user.lastName ILIKE :search)',
        { search: `%${search}%` },
      );
    }

    // Filtre par rôle
    if (roleCode) {
      queryBuilder.andWhere('role.code = :roleCode', { roleCode });
    }

    // Filtre par statut
    if (status) {
      queryBuilder.andWhere('user.status = :status', { status });
    }

    // Tri
    const sortColumn =
      sortBy === 'lastName'
        ? 'user.lastName'
        : sortBy === 'email'
          ? 'user.email'
          : sortBy === 'lastLoginAt'
            ? 'user.lastLoginAt'
            : 'user.createdAt';
    queryBuilder.orderBy(sortColumn, sortOrder);

    const [users, total] = await queryBuilder.skip(skip).take(limit).getManyAndCount();

    return { users, total };
  }

  // Récupère un utilisateur par son ID
  async findById(id: string): Promise<User> {
    const user = await this.userRepository.findOne({
      where: { id },
      relations: ['role'],
    });

    if (!user) {
      throw new NotFoundException(`Utilisateur avec l'ID "${id}" non trouvé`);
    }

    return user;
  }

  // Récupère un utilisateur par son email
  async findByEmail(email: string): Promise<User | null> {
    return this.userRepository.findOne({
      where: { email },
      relations: ['role'],
    });
  }

  // Met à jour un utilisateur
  async update(id: string, updateUserDto: UpdateUserDto, currentUser: User): Promise<User> {
    const user = await this.findById(id);

    // Vérification : un ADMIN ne peut pas modifier un SUPER_ADMIN
    if (user.role.code === 'SUPER_ADMIN' && currentUser.role.code !== 'SUPER_ADMIN') {
      throw new ForbiddenException('Vous ne pouvez pas modifier un Super Administrateur');
    }

    // Vérification : seul un SUPER_ADMIN peut attribuer le rôle SUPER_ADMIN
    if (updateUserDto.roleId) {
      const newRole = await this.roleRepository.findOne({ where: { id: updateUserDto.roleId } });
      if (!newRole) {
        throw new NotFoundException(`Rôle avec l'ID "${updateUserDto.roleId}" non trouvé`);
      }

      if (newRole.code === 'SUPER_ADMIN' && currentUser.role.code !== 'SUPER_ADMIN') {
        throw new ForbiddenException('Seul un Super Administrateur peut attribuer ce rôle');
      }

      user.roleId = newRole.id;
      user.role = newRole;
    }

    // Vérification unicité email si modifié
    if (updateUserDto.email && updateUserDto.email !== user.email) {
      const existingUser = await this.findByEmail(updateUserDto.email);
      if (existingUser) {
        throw new ConflictException('Cet email est déjà utilisé');
      }
      user.email = updateUserDto.email;
    }

    // Mise à jour des autres champs
    if (updateUserDto.firstName !== undefined) user.firstName = updateUserDto.firstName;
    if (updateUserDto.lastName !== undefined) user.lastName = updateUserDto.lastName;
    if (updateUserDto.displayName !== undefined) user.displayName = updateUserDto.displayName;
    if (updateUserDto.phone !== undefined) user.phone = updateUserDto.phone;

    const updatedUser = await this.userRepository.save(user);

    // Log de l'action update user
    await this.activityLogService.log({
      actorType: currentUser.role.code === 'SUPER_ADMIN' ? ActorType.SUPERADMIN : ActorType.ADMIN,
      actorUserId: currentUser.id,
      actionType: ActionType.USER_UPDATED,
      entityType: EntityType.USER,
      entityId: user.id,
      metadata: {
        updatedFields: Object.keys(updateUserDto),
        targetEmail: user.email,
      },
    });

    return updatedUser;
  }

  // Change le statut d'un utilisateur (activer, désactiver, suspendre)
  async updateStatus(id: string, updateStatusDto: UpdateUserStatusDto, currentUser: User): Promise<User> {
    const user = await this.findById(id);

    // Vérification : on ne peut pas modifier son propre statut
    if (user.id === currentUser.id) {
      throw new BadRequestException('Vous ne pouvez pas modifier votre propre statut');
    }

    // Vérification : un ADMIN ne peut pas modifier le statut d'un SUPER_ADMIN
    if (user.role.code === 'SUPER_ADMIN' && currentUser.role.code !== 'SUPER_ADMIN') {
      throw new ForbiddenException("Vous ne pouvez pas modifier le statut d'un Super Administrateur");
    }

    const oldStatus = user.status;
    user.status = updateStatusDto.status;

    const updatedUser = await this.userRepository.save(user);

    // Log de l'action changement de status
    await this.activityLogService.log({
      actorType: currentUser.role.code === 'SUPER_ADMIN' ? ActorType.SUPERADMIN : ActorType.ADMIN,
      actorUserId: currentUser.id,
      actionType: ActionType.USER_STATUS_CHANGED,
      entityType: EntityType.USER,
      entityId: user.id,
      severity: updateStatusDto.status === UserStatus.SUSPENDED ? LogSeverity.WARNING : LogSeverity.INFO,
      metadata: {
        targetEmail: user.email,
        oldStatus,
        newStatus: updateStatusDto.status,
        reason: updateStatusDto.reason,
      },
    });

    return updatedUser;
  }

  // Supprimer un utilisateur
  async remove(id: string, currentUser: User): Promise<void> {
    const user = await this.findById(id);

    // Vérification : on ne peut pas se supprimer soi-même
    if (user.id === currentUser.id) {
      throw new BadRequestException('Vous ne pouvez pas supprimer votre propre compte');
    }

    // Vérification : un ADMIN ne peut pas supprimer un SUPER_ADMIN
    if (user.role.code === 'SUPER_ADMIN' && currentUser.role.code !== 'SUPER_ADMIN') {
      throw new ForbiddenException('Vous ne pouvez pas supprimer un Super Administrateur');
    }

    // Vérification : on ne peut pas supprimer le dernier SUPER_ADMIN
    if (user.role.code === 'SUPER_ADMIN') {
      const superAdminCount = await this.userRepository.count({
        where: { role: { code: 'SUPER_ADMIN' } },
      });
      if (superAdminCount <= 1) {
        throw new BadRequestException('Impossible de supprimer le dernier Super Administrateur');
      }
    }

    // Log AVANT suppression (pour garder l'info)
    await this.activityLogService.log({
      actorType: currentUser.role.code === 'SUPER_ADMIN' ? ActorType.SUPERADMIN : ActorType.ADMIN,
      actorUserId: currentUser.id,
      actionType: ActionType.USER_DELETED,
      entityType: EntityType.USER,
      entityId: user.id,
      severity: LogSeverity.WARNING,
      metadata: {
        deletedUserEmail: user.email,
        deletedUserRole: user.role.code,
      },
    });

    await this.userRepository.remove(user);
  }

  // Récupère les statistiques des utilisateurs
  async getStats(): Promise<UsersStatsDto> {
    const total = await this.userRepository.count();

    const byStatus = await this.userRepository
      .createQueryBuilder('user')
      .select('user.status', 'status')
      .addSelect('COUNT(*)', 'count')
      .groupBy('user.status')
      .getRawMany<{ status: UserStatus; count: string }>();

    const byRole = await this.userRepository
      .createQueryBuilder('user')
      .leftJoin('user.role', 'role')
      .select('role.code', 'roleCode')
      .addSelect('COUNT(*)', 'count')
      .groupBy('role.code')
      .getRawMany<{ roleCode: string; count: string }>();

    const byAuthProvider = await this.userRepository
      .createQueryBuilder('user')
      .select('user.authProvider', 'authProvider')
      .addSelect('COUNT(*)', 'count')
      .groupBy('user.authProvider')
      .getRawMany<{ authProvider: string; count: string }>();

    // Transforme les résultats
    const statusMap = byStatus.reduce(
      (acc, item) => {
        acc[item.status] = parseInt(item.count, 10);
        return acc;
      },
      {} as Record<UserStatus, number>,
    );

    const roleMap = byRole.reduce(
      (acc, item) => {
        acc[item.roleCode] = parseInt(item.count, 10);
        return acc;
      },
      {} as Record<string, number>,
    );

    const authProviderMap = byAuthProvider.reduce(
      (acc, item) => {
        acc[item.authProvider] = parseInt(item.count, 10);
        return acc;
      },
      {} as Record<string, number>,
    );

    return {
      total,
      active: statusMap[UserStatus.ACTIVE] ?? 0,
      inactive: statusMap[UserStatus.INACTIVE] ?? 0,
      suspended: statusMap[UserStatus.SUSPENDED] ?? 0,
      byRole: roleMap,
      byAuthProvider: authProviderMap,
    };
  }

  /**
   * Récupère la liste des rôles disponibles
   */
  async getAvailableRoles(): Promise<Role[]> {
    return this.roleRepository.find({
      order: { code: 'ASC' },
    });
  }
}
