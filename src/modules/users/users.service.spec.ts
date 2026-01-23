import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { NotFoundException, ConflictException, ForbiddenException, BadRequestException } from '@nestjs/common';
import { UsersService } from './users.service';
import { User, UserStatus, AuthProvider } from './entities/user.entity';
import { Role } from '../roles/entities/role.entity';
import { ActivityLogService } from '../activity-logs';

describe('UsersService', () => {
  let service: UsersService;

  // Mocks des services et dépôts
  let mockUserRepository: Record<string, jest.Mock>;
  let mockRoleRepository: Record<string, jest.Mock>;
  let mockActivityLogService: Record<string, jest.Mock>;
  let mockQueryBuilder: Record<string, jest.Mock>;

  // ========================================
  // FACTORIES (Générateurs d'objets frais)
  // ========================================

  const createMockRole = (code: 'USER' | 'ADMIN' | 'SUPER_ADMIN'): Role =>
    ({
      id: `role-${code.toLowerCase()}-id`,
      code: code,
      label: code.charAt(0) + code.slice(1).toLowerCase().replace('_', ' '),
      createdAt: new Date(),
    }) as Role;

  const createMockUser = (
    id: string,
    roleCode: 'USER' | 'ADMIN' | 'SUPER_ADMIN',
    email: string = 'user@example.com',
  ): User =>
    ({
      id,
      email,
      passwordHash: 'hashed-password',
      firstName: 'John',
      lastName: 'Doe',
      displayName: 'John Doe',
      phone: '0123456789',
      roleId: `role-${roleCode.toLowerCase()}-id`,
      role: createMockRole(roleCode),
      status: UserStatus.ACTIVE,
      authProvider: AuthProvider.LOCAL,
      createdAt: new Date(),
      updatedAt: new Date(),
    }) as User;

  beforeEach(async () => {
    // Fresh QueryBuilder pour chaque test
    mockQueryBuilder = {
      leftJoinAndSelect: jest.fn().mockReturnThis(),
      leftJoin: jest.fn().mockReturnThis(),
      select: jest.fn().mockReturnThis(),
      addSelect: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      groupBy: jest.fn().mockReturnThis(),
      skip: jest.fn().mockReturnThis(),
      take: jest.fn().mockReturnThis(),
      getManyAndCount: jest.fn().mockResolvedValue([[createMockUser('1', 'USER')], 1]),
      getRawMany: jest.fn().mockResolvedValue([]),
    };

    mockUserRepository = {
      findOne: jest.fn(),
      find: jest.fn(),
      create: jest.fn(),
      save: jest.fn((u) => Promise.resolve(u)), // Retourne l'objet tel quel
      remove: jest.fn(),
      count: jest.fn(),
      createQueryBuilder: jest.fn().mockReturnValue(mockQueryBuilder),
    };

    mockRoleRepository = {
      findOne: jest.fn(),
      find: jest.fn(),
    };

    mockActivityLogService = {
      log: jest.fn().mockResolvedValue(null),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsersService,
        { provide: getRepositoryToken(User), useValue: mockUserRepository },
        { provide: getRepositoryToken(Role), useValue: mockRoleRepository },
        { provide: ActivityLogService, useValue: mockActivityLogService },
      ],
    }).compile();

    service = module.get<UsersService>(UsersService);
  });

  // ========================================
  // MÉTODES DE RECHERCHE (Find)
  // ========================================

  describe('findAll', () => {
    it('devrait retourner les utilisateurs avec pagination par défaut', async () => {
      const result = await service.findAll({});
      expect(result).toBeDefined();
      expect(mockUserRepository.createQueryBuilder).toHaveBeenCalledWith('user');
    });

    it('devrait appliquer le filtre de recherche', async () => {
      await service.findAll({ search: 'john' });
      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(expect.stringContaining('ILIKE :search'), {
        search: '%john%',
      });
    });

    it('devrait filtrer par code de rôle', async () => {
      await service.findAll({ roleCode: 'ADMIN' });
      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith('role.code = :roleCode', { roleCode: 'ADMIN' });
    });

    it('devrait filtrer par statut', async () => {
      await service.findAll({ status: UserStatus.SUSPENDED });
      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith('user.status = :status', { status: UserStatus.SUSPENDED });
    });

    it('devrait appliquer le tri personnalisé', async () => {
      await service.findAll({ sortBy: 'email', sortOrder: 'ASC' });
      expect(mockQueryBuilder.orderBy).toHaveBeenCalledWith('user.email', 'ASC');
    });
  });

  describe('findById', () => {
    it('devrait retourner un utilisateur par son ID', async () => {
      const user = createMockUser('123', 'USER');
      mockUserRepository.findOne.mockResolvedValue(user);
      const result = await service.findById('123');
      expect(result.id).toBe('123');
    });

    it("devrait lever une NotFoundException si l'utilisateur n'existe pas", async () => {
      mockUserRepository.findOne.mockResolvedValue(null);
      await expect(service.findById('invalid')).rejects.toThrow(NotFoundException);
    });
  });

  describe('findByEmail', () => {
    it('devrait retourner un utilisateur par son email', async () => {
      const user = createMockUser('1', 'USER', 'test@test.com');
      mockUserRepository.findOne.mockResolvedValue(user);
      const result = await service.findByEmail('test@test.com');
      expect(result?.email).toBe('test@test.com');
    });

    it("devrait retourner null si l'email n'existe pas", async () => {
      mockUserRepository.findOne.mockResolvedValue(null);
      expect(await service.findByEmail('none@test.com')).toBeNull();
    });
  });

  // ========================================
  // MÉTHODE UPDATE
  // ========================================

  describe('update', () => {
    it('devrait mettre à jour un utilisateur avec succès', async () => {
      const target = createMockUser('u-1', 'USER');
      const admin = createMockUser('a-1', 'ADMIN');
      mockUserRepository.findOne.mockResolvedValue(target);

      const result = await service.update('u-1', { firstName: 'Jane' }, admin);
      expect(result.firstName).toBe('Jane');
      expect(mockUserRepository.save).toHaveBeenCalled();
    });

    it('devrait lever une ForbiddenException si un ADMIN tente de modifier un SUPER_ADMIN', async () => {
      const targetSA = createMockUser('sa-1', 'SUPER_ADMIN');
      const admin = createMockUser('a-1', 'ADMIN');
      mockUserRepository.findOne.mockResolvedValue(targetSA);

      await expect(service.update('sa-1', { firstName: 'Hack' }, admin)).rejects.toThrow(ForbiddenException);
    });

    it('devrait permettre à un SUPER_ADMIN de modifier un autre SUPER_ADMIN', async () => {
      const targetSA = createMockUser('sa-1', 'SUPER_ADMIN');
      const currentSA = createMockUser('sa-2', 'SUPER_ADMIN');
      mockUserRepository.findOne.mockResolvedValue(targetSA);

      const result = await service.update('sa-1', { firstName: 'Updated' }, currentSA);
      expect(result.firstName).toBe('Updated');
    });

    it("devrait lever une ConflictException si l'email est déjà utilisé", async () => {
      const target = createMockUser('u-1', 'USER');
      const admin = createMockUser('a-1', 'ADMIN');
      mockUserRepository.findOne
        .mockResolvedValueOnce(target) // Premier appel pour findById
        .mockResolvedValueOnce(createMockUser('u-2', 'USER', 'taken@test.com')); // Deuxième appel pour findByEmail

      await expect(service.update('u-1', { email: 'taken@test.com' }, admin)).rejects.toThrow(ConflictException);
    });

    it("devrait lever une ForbiddenException si un ADMIN tente d'attribuer le rôle SUPER_ADMIN", async () => {
      const target = createMockUser('u-1', 'USER');
      const admin = createMockUser('a-1', 'ADMIN');
      mockUserRepository.findOne.mockResolvedValue(target);
      mockRoleRepository.findOne.mockResolvedValue(createMockRole('SUPER_ADMIN'));

      await expect(service.update('u-1', { roleId: 'role-sa' }, admin)).rejects.toThrow(ForbiddenException);
    });

    it("devrait permettre à un SUPER_ADMIN d'attribuer le rôle SUPER_ADMIN", async () => {
      const target = createMockUser('u-1', 'USER');
      const currentSA = createMockUser('sa-1', 'SUPER_ADMIN');
      const saRole = createMockRole('SUPER_ADMIN');

      mockUserRepository.findOne.mockResolvedValue(target);
      mockRoleRepository.findOne.mockResolvedValue(saRole);

      const result = await service.update('u-1', { roleId: saRole.id }, currentSA);
      expect(result.role.code).toBe('SUPER_ADMIN');
    });
  });

  // ========================================
  // MÉTHODE UPDATE STATUS
  // ========================================

  describe('updateStatus', () => {
    it("devrait changer le statut d'un utilisateur", async () => {
      const target = createMockUser('u-1', 'USER');
      const admin = createMockUser('a-1', 'ADMIN');
      mockUserRepository.findOne.mockResolvedValue(target);

      const result = await service.updateStatus('u-1', { status: UserStatus.SUSPENDED }, admin);
      expect(result.status).toBe(UserStatus.SUSPENDED);
    });

    it("devrait lever une BadRequestException si l'utilisateur tente de modifier son propre statut", async () => {
      const admin = createMockUser('a-1', 'ADMIN');
      mockUserRepository.findOne.mockResolvedValue(admin);

      await expect(service.updateStatus('a-1', { status: UserStatus.INACTIVE }, admin)).rejects.toThrow(
        BadRequestException,
      );
    });

    it("devrait lever une ForbiddenException si un ADMIN tente de modifier le statut d'un SUPER_ADMIN", async () => {
      const targetSA = createMockUser('sa-1', 'SUPER_ADMIN');
      const admin = createMockUser('a-1', 'ADMIN');
      mockUserRepository.findOne.mockResolvedValue(targetSA);

      await expect(service.updateStatus('sa-1', { status: UserStatus.SUSPENDED }, admin)).rejects.toThrow(
        ForbiddenException,
      );
    });
  });

  // ========================================
  // MÉTHODE REMOVE
  // ========================================

  describe('remove', () => {
    it('devrait supprimer un utilisateur avec succès', async () => {
      const target = createMockUser('u-1', 'USER');
      const admin = createMockUser('a-1', 'ADMIN');
      mockUserRepository.findOne.mockResolvedValue(target);

      await service.remove('u-1', admin);
      expect(mockUserRepository.remove).toHaveBeenCalledWith(target);
    });

    it("devrait lever une BadRequestException si l'utilisateur tente de se supprimer lui-même", async () => {
      const admin = createMockUser('a-1', 'ADMIN');
      mockUserRepository.findOne.mockResolvedValue(admin);

      await expect(service.remove('a-1', admin)).rejects.toThrow(BadRequestException);
    });

    it('devrait lever une ForbiddenException si un ADMIN tente de supprimer un SUPER_ADMIN', async () => {
      const targetSA = createMockUser('sa-1', 'SUPER_ADMIN');
      const admin = createMockUser('a-1', 'ADMIN');
      mockUserRepository.findOne.mockResolvedValue(targetSA);

      await expect(service.remove('sa-1', admin)).rejects.toThrow(ForbiddenException);
    });

    it('devrait lever une BadRequestException si on tente de supprimer le dernier SUPER_ADMIN', async () => {
      const targetSA = createMockUser('sa-1', 'SUPER_ADMIN');
      const currentSA = createMockUser('sa-2', 'SUPER_ADMIN');
      mockUserRepository.findOne.mockResolvedValue(targetSA);
      mockUserRepository.count.mockResolvedValue(1);

      await expect(service.remove('sa-1', currentSA)).rejects.toThrow(
        'Impossible de supprimer le dernier Super Administrateur',
      );
    });

    it("devrait permettre de supprimer un SUPER_ADMIN s'il en reste d'autres", async () => {
      const targetSA = createMockUser('sa-1', 'SUPER_ADMIN');
      const currentSA = createMockUser('sa-2', 'SUPER_ADMIN');
      mockUserRepository.findOne.mockResolvedValue(targetSA);
      mockUserRepository.count.mockResolvedValue(2);

      await service.remove('sa-1', currentSA);
      expect(mockUserRepository.remove).toHaveBeenCalled();
    });
  });

  // ========================================
  // STATS ET ROLES
  // ========================================

  describe('getStats', () => {
    it('devrait retourner les statistiques des utilisateurs', async () => {
      mockUserRepository.count.mockResolvedValue(100);
      mockQueryBuilder.getRawMany
        .mockResolvedValueOnce([{ status: 'ACTIVE', count: '80' }])
        .mockResolvedValueOnce([{ roleCode: 'USER', count: '90' }])
        .mockResolvedValueOnce([{ authProvider: 'LOCAL', count: '100' }]);

      const result = await service.getStats();
      expect(result.total).toBe(100);
      expect(result.active).toBe(80);
    });
  });

  describe('getAvailableRoles', () => {
    it('devrait retourner la liste des rôles disponibles', async () => {
      const roles = [createMockRole('USER'), createMockRole('ADMIN')];
      mockRoleRepository.find.mockResolvedValue(roles);

      const result = await service.getAvailableRoles();
      expect(result).toHaveLength(2);
      expect(mockRoleRepository.find).toHaveBeenCalledWith({ order: { code: 'ASC' } });
    });
  });
});
