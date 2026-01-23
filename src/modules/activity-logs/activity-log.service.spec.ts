import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { SelectQueryBuilder } from 'typeorm';
import { ActivityLogService, CreateActivityLogDto } from './activity-log.service';
import { ActivityLog, ActorType, ActionType, EntityType, LogSeverity } from './entities/activity-log.entity';

describe('ActivityLogService', () => {
  let service: ActivityLogService;

  // Données de test réutilisables
  const mockActivityLog: ActivityLog = {
    id: 'log-id-123',
    actorType: ActorType.USER,
    actorUserId: 'user-id-123',
    actionType: ActionType.USER_LOGIN,
    entityType: EntityType.USER,
    entityId: 'user-id-123',
    severity: LogSeverity.INFO,
    metadata: { email: 'test@example.com' },
    createdAt: new Date(),
  };

  // Mock du QueryBuilder pour les requêtes complexes
  const mockQueryBuilder = {
    leftJoinAndSelect: jest.fn().mockReturnThis(),
    orderBy: jest.fn().mockReturnThis(),
    andWhere: jest.fn().mockReturnThis(),
    skip: jest.fn().mockReturnThis(),
    take: jest.fn().mockReturnThis(),
    getManyAndCount: jest.fn().mockResolvedValue([[mockActivityLog], 1]),
  } as unknown as jest.Mocked<SelectQueryBuilder<ActivityLog>>;

  const mockRepository = {
    create: jest.fn(),
    save: jest.fn(),
    find: jest.fn(),
    findOne: jest.fn(),
    createQueryBuilder: jest.fn().mockReturnValue(mockQueryBuilder),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ActivityLogService,
        {
          provide: getRepositoryToken(ActivityLog),
          useValue: mockRepository,
        },
      ],
    }).compile();

    service = module.get<ActivityLogService>(ActivityLogService);
    jest.clearAllMocks();
  });

  it('devrait être défini', () => {
    expect(service).toBeDefined();
  });

  // ========================================
  // Tests pour la méthode log()
  // ========================================
  describe('log', () => {
    const createLogDto: CreateActivityLogDto = {
      actorType: ActorType.USER,
      actorUserId: 'user-id-123',
      actionType: ActionType.USER_LOGIN,
      entityType: EntityType.USER,
      entityId: 'user-id-123',
      metadata: { email: 'test@example.com' },
    };

    it("devrait créer un log d'activité avec succès", async () => {
      mockRepository.create.mockReturnValue(mockActivityLog);
      mockRepository.save.mockResolvedValue(mockActivityLog);

      const result = await service.log(createLogDto);

      expect(result).toEqual(mockActivityLog);
      expect(mockRepository.create).toHaveBeenCalledWith({
        ...createLogDto,
        severity: LogSeverity.INFO,
        metadata: createLogDto.metadata,
      });
      expect(mockRepository.save).toHaveBeenCalled();
    });

    it('devrait utiliser INFO comme sévérité par défaut', async () => {
      const logWithoutSeverity: CreateActivityLogDto = {
        actorType: ActorType.USER,
        actionType: ActionType.USER_LOGIN,
        entityType: EntityType.USER,
      };

      mockRepository.create.mockReturnValue(mockActivityLog);
      mockRepository.save.mockResolvedValue(mockActivityLog);

      await service.log(logWithoutSeverity);

      expect(mockRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          severity: LogSeverity.INFO,
        }),
      );
    });

    it('devrait utiliser un objet vide comme metadata par défaut', async () => {
      const logWithoutMetadata: CreateActivityLogDto = {
        actorType: ActorType.SYSTEM,
        actionType: ActionType.USER_REGISTERED,
        entityType: EntityType.USER,
      };

      mockRepository.create.mockReturnValue(mockActivityLog);
      mockRepository.save.mockResolvedValue(mockActivityLog);

      await service.log(logWithoutMetadata);

      expect(mockRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          metadata: {},
        }),
      );
    });

    it("devrait retourner null et ne pas propager l'erreur en cas d'échec", async () => {
      mockRepository.create.mockReturnValue(mockActivityLog);
      mockRepository.save.mockRejectedValue(new Error('Erreur BDD'));

      // Capture console.error pour éviter le bruit dans les tests
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

      const result = await service.log(createLogDto);

      expect(result).toBeNull();
      expect(consoleSpy).toHaveBeenCalled();

      consoleSpy.mockRestore();
    });
  });

  // ========================================
  // Tests pour la méthode logUserAction()
  // ========================================
  describe('logUserAction', () => {
    it('devrait créer un log pour une action utilisateur', async () => {
      mockRepository.create.mockReturnValue(mockActivityLog);
      mockRepository.save.mockResolvedValue(mockActivityLog);

      const result = await service.logUserAction('user-id-123', ActionType.USER_LOGIN, { ip: '127.0.0.1' });

      expect(result).toEqual(mockActivityLog);
      expect(mockRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          actorType: ActorType.USER,
          actorUserId: 'user-id-123',
          actionType: ActionType.USER_LOGIN,
          entityType: EntityType.USER,
          entityId: 'user-id-123',
        }),
      );
    });
  });

  // ========================================
  // Tests pour la méthode logError()
  // ========================================
  describe('logError', () => {
    it("devrait créer un log d'erreur avec sévérité ERROR", async () => {
      mockRepository.create.mockReturnValue({ ...mockActivityLog, severity: LogSeverity.ERROR });
      mockRepository.save.mockResolvedValue({ ...mockActivityLog, severity: LogSeverity.ERROR });

      const result = await service.logError(ActionType.USER_LOGIN_FAILED, EntityType.USER, {
        reason: 'Invalid password',
      });

      expect(result).toBeDefined();
      expect(mockRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          severity: LogSeverity.ERROR,
          actorType: ActorType.SYSTEM,
        }),
      );
    });

    it('devrait utiliser ActorType.USER si un actorUserId est fourni', async () => {
      mockRepository.create.mockReturnValue(mockActivityLog);
      mockRepository.save.mockResolvedValue(mockActivityLog);

      await service.logError(ActionType.USER_LOGIN_FAILED, EntityType.USER, { reason: 'test' }, 'user-id-123');

      expect(mockRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          actorType: ActorType.USER,
          actorUserId: 'user-id-123',
        }),
      );
    });
  });

  // ========================================
  // Tests pour la méthode findAll()
  // ========================================
  describe('findAll', () => {
    it('devrait retourner les logs avec pagination par défaut', async () => {
      const result = await service.findAll();

      expect(result).toEqual({ logs: [mockActivityLog], total: 1 });
      expect(mockRepository.createQueryBuilder).toHaveBeenCalledWith('log');
      expect(mockQueryBuilder.skip).toHaveBeenCalledWith(0);
      expect(mockQueryBuilder.take).toHaveBeenCalledWith(50);
    });

    it('devrait appliquer les filtres de pagination', async () => {
      await service.findAll({ page: 2, limit: 10 });

      expect(mockQueryBuilder.skip).toHaveBeenCalledWith(10); // (2-1) * 10
      expect(mockQueryBuilder.take).toHaveBeenCalledWith(10);
    });

    it('devrait filtrer par actionType', async () => {
      await service.findAll({ actionType: ActionType.USER_LOGIN });

      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith('log.actionType = :actionType', {
        actionType: ActionType.USER_LOGIN,
      });
    });

    it('devrait filtrer par entityType', async () => {
      await service.findAll({ entityType: EntityType.USER });

      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith('log.entityType = :entityType', {
        entityType: EntityType.USER,
      });
    });

    it('devrait filtrer par actorUserId', async () => {
      await service.findAll({ actorUserId: 'user-id-123' });

      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith('log.actorUserId = :actorUserId', {
        actorUserId: 'user-id-123',
      });
    });

    it('devrait filtrer par severity', async () => {
      await service.findAll({ severity: LogSeverity.ERROR });

      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith('log.severity = :severity', {
        severity: LogSeverity.ERROR,
      });
    });

    it('devrait filtrer par actorType', async () => {
      await service.findAll({ actorType: ActorType.ADMIN });

      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith('log.actorType = :actorType', {
        actorType: ActorType.ADMIN,
      });
    });

    it('devrait combiner plusieurs filtres', async () => {
      await service.findAll({
        actionType: ActionType.USER_LOGIN,
        severity: LogSeverity.WARNING,
        actorUserId: 'user-id-123',
      });

      expect(mockQueryBuilder.andWhere).toHaveBeenCalledTimes(3);
    });
  });

  // ========================================
  // Tests pour la méthode findByUser()
  // ========================================
  describe('findByUser', () => {
    it("devrait retourner les logs d'un utilisateur", async () => {
      mockRepository.find.mockResolvedValue([mockActivityLog]);

      const result = await service.findByUser('user-id-123');

      expect(result).toEqual([mockActivityLog]);
      expect(mockRepository.find).toHaveBeenCalledWith({
        where: { actorUserId: 'user-id-123' },
        order: { createdAt: 'DESC' },
        take: 50,
      });
    });

    it('devrait respecter la limite personnalisée', async () => {
      mockRepository.find.mockResolvedValue([mockActivityLog]);

      await service.findByUser('user-id-123', 10);

      expect(mockRepository.find).toHaveBeenCalledWith(
        expect.objectContaining({
          take: 10,
        }),
      );
    });
  });

  // ========================================
  // Tests pour la méthode findByEntity()
  // ========================================
  describe('findByEntity', () => {
    it("devrait retourner les logs d'une entité spécifique", async () => {
      mockRepository.find.mockResolvedValue([mockActivityLog]);

      const result = await service.findByEntity(EntityType.ORDER, 'order-id-123');

      expect(result).toEqual([mockActivityLog]);
      expect(mockRepository.find).toHaveBeenCalledWith({
        where: { entityType: EntityType.ORDER, entityId: 'order-id-123' },
        order: { createdAt: 'DESC' },
        take: 50,
        relations: ['actorUser'],
      });
    });

    it('devrait respecter la limite personnalisée', async () => {
      mockRepository.find.mockResolvedValue([mockActivityLog]);

      await service.findByEntity(EntityType.ORDER, 'order-id-123', 25);

      expect(mockRepository.find).toHaveBeenCalledWith(
        expect.objectContaining({
          take: 25,
        }),
      );
    });
  });
});
