import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ConflictException, NotFoundException } from '@nestjs/common';
import { CategoriesService } from '../services';
import { Category } from '../entities/category.entity';
import { ActivityLogService } from '../../activity-logs';
import { User } from '../../users/entities/user.entity';
import { Role } from '../../roles/entities/role.entity';

describe('CategoriesService', () => {
  let service: CategoriesService;
  let categoryRepository: jest.Mocked<Repository<Category>>;
  let activityLogService: jest.Mocked<ActivityLogService>;

  // ========================================
  // Mock Data
  // ========================================
  const mockRole: Role = {
    id: 'role-uuid',
    code: 'ADMIN',
    label: 'Administrateur',
    createdAt: new Date(),
  } as Role;

  const mockUser: User = {
    id: 'user-uuid',
    email: 'admin@artshop.local',
    passwordHash: 'hashed',
    firstName: 'Admin',
    lastName: 'Test',
    roleId: mockRole.id,
    role: mockRole,
    status: 'ACTIVE',
    authProvider: 'LOCAL',
    createdAt: new Date(),
    updatedAt: new Date(),
  } as User;

  const mockCategory: Category = {
    id: 'category-uuid',
    name: 'Illustrations',
    slug: 'illustrations',
    position: 0,
    subcategories: [],
    createdBy: mockUser.id,
    createdByUser: mockUser,
    createdAt: new Date(),
    updatedAt: new Date(),
  } as Category;

  const mockCategoryWithSubcategories: Category = {
    ...mockCategory,
    subcategories: [
      {
        id: 'sub-uuid-1',
        name: 'Japon',
        slug: 'japon',
        position: 0,
        categoryId: mockCategory.id,
        createdBy: mockUser.id,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: 'sub-uuid-2',
        name: 'Nature',
        slug: 'nature',
        position: 1,
        categoryId: mockCategory.id,
        createdBy: mockUser.id,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ],
  } as Category;

  // ========================================
  // Setup
  // ========================================
  beforeEach(async () => {
    const mockCategoryRepository = {
      create: jest.fn(),
      save: jest.fn(),
      find: jest.fn(),
      findOne: jest.fn(),
      remove: jest.fn(),
    };

    const mockActivityLogService = {
      log: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CategoriesService,
        {
          provide: getRepositoryToken(Category),
          useValue: mockCategoryRepository,
        },
        {
          provide: ActivityLogService,
          useValue: mockActivityLogService,
        },
      ],
    }).compile();

    service = module.get<CategoriesService>(CategoriesService);
    categoryRepository = module.get(getRepositoryToken(Category));
    activityLogService = module.get(ActivityLogService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  // ========================================
  // CREATE
  // ========================================
  describe('create', () => {
    const createDto = { name: 'Illustrations', position: 0 };

    it('devrait créer une catégorie avec succès', async () => {
      categoryRepository.findOne.mockResolvedValue(null);
      categoryRepository.create.mockReturnValue(mockCategory);
      categoryRepository.save.mockResolvedValue(mockCategory);

      const result = await service.create(createDto, mockUser);

      expect(result).toBeDefined();
      expect(result.name).toBe('Illustrations');
      expect(result.slug).toBe('illustrations');
      expect(categoryRepository.create).toHaveBeenCalled();
      expect(categoryRepository.save).toHaveBeenCalled();
      expect(activityLogService.log).toHaveBeenCalled();
    });

    it('devrait créer une catégorie avec un slug personnalisé', async () => {
      const dtoWithSlug = { ...createDto, slug: 'custom-slug' };
      const categoryWithCustomSlug = { ...mockCategory, slug: 'custom-slug' };

      categoryRepository.findOne.mockResolvedValue(null);
      categoryRepository.create.mockReturnValue(categoryWithCustomSlug);
      categoryRepository.save.mockResolvedValue(categoryWithCustomSlug);

      const result = await service.create(dtoWithSlug, mockUser);

      expect(result.slug).toBe('custom-slug');
    });

    it('devrait générer automatiquement le slug si non fourni', async () => {
      const dtoWithAccents = { name: 'Été Français', position: 0 };
      const expectedCategory: Category = {
        ...mockCategory,
        name: dtoWithAccents.name,
        slug: 'ete-francais',
        position: 0,
      };

      categoryRepository.findOne.mockResolvedValue(null);
      categoryRepository.create.mockReturnValue(expectedCategory);
      categoryRepository.save.mockResolvedValue(expectedCategory);

      await service.create(dtoWithAccents, mockUser);

      expect(categoryRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          slug: 'ete-francais',
        }),
      );
    });

    it('devrait lever ConflictException si le nom existe déjà', async () => {
      categoryRepository.findOne
        .mockResolvedValueOnce(null) // slug check
        .mockResolvedValueOnce(mockCategory); // name check

      await expect(service.create(createDto, mockUser)).rejects.toThrow(ConflictException);
    });

    it('devrait lever ConflictException si le slug existe déjà', async () => {
      categoryRepository.findOne.mockResolvedValueOnce(mockCategory); // slug check

      await expect(service.create(createDto, mockUser)).rejects.toThrow(ConflictException);
    });
  });

  // ========================================
  // READ ALL
  // ========================================
  describe('findAll', () => {
    it('devrait retourner toutes les catégories', async () => {
      const categories: Category[] = [mockCategory, { ...mockCategory, id: 'cat-2', name: 'Photographies' }];
      categoryRepository.find.mockResolvedValue(categories);

      const result = await service.findAll();

      expect(result).toHaveLength(2);
      expect(categoryRepository.find).toHaveBeenCalledWith({
        order: { position: 'ASC', name: 'ASC' },
        relations: ['subcategories'],
      });
    });

    it('devrait retourner un tableau vide si aucune catégorie', async () => {
      categoryRepository.find.mockResolvedValue([]);

      const result = await service.findAll();

      expect(result).toEqual([]);
    });
  });

  describe('findAllWithSubcategories', () => {
    it('devrait retourner les catégories avec leurs sous-catégories', async () => {
      categoryRepository.find.mockResolvedValue([mockCategoryWithSubcategories]);

      const result = await service.findAllWithSubcategories();

      expect(result).toHaveLength(1);
      expect(result[0].subcategories).toHaveLength(2);
      expect(result[0].subcategories[0].name).toBe('Japon');
    });
  });

  // ========================================
  // READ ONE
  // ========================================
  describe('findById', () => {
    it('devrait retourner une catégorie par ID', async () => {
      categoryRepository.findOne.mockResolvedValue(mockCategory);

      const result = await service.findById('category-uuid');

      expect(result).toBeDefined();
      expect(result.id).toBe('category-uuid');
      expect(categoryRepository.findOne).toHaveBeenCalledWith({
        where: { id: 'category-uuid' },
        relations: ['subcategories'],
      });
    });

    it("devrait lever NotFoundException si la catégorie n'existe pas", async () => {
      categoryRepository.findOne.mockResolvedValue(null);

      await expect(service.findById('invalid-uuid')).rejects.toThrow(NotFoundException);
    });
  });

  describe('findByIdWithSubcategories', () => {
    it('devrait retourner une catégorie avec ses sous-catégories', async () => {
      categoryRepository.findOne.mockResolvedValue(mockCategoryWithSubcategories);

      const result = await service.findByIdWithSubcategories('category-uuid');

      expect(result.subcategories).toHaveLength(2);
    });

    it("devrait lever NotFoundException si la catégorie n'existe pas", async () => {
      categoryRepository.findOne.mockResolvedValue(null);

      await expect(service.findByIdWithSubcategories('invalid-uuid')).rejects.toThrow(NotFoundException);
    });
  });

  describe('findBySlug', () => {
    it('devrait retourner une catégorie par slug', async () => {
      categoryRepository.findOne.mockResolvedValue(mockCategory);

      const result = await service.findBySlug('illustrations');

      expect(result).toBeDefined();
      expect(result.slug).toBe('illustrations');
      expect(categoryRepository.findOne).toHaveBeenCalledWith({
        where: { slug: 'illustrations' },
        relations: ['subcategories'],
      });
    });

    it("devrait lever NotFoundException si le slug n'existe pas", async () => {
      categoryRepository.findOne.mockResolvedValue(null);

      await expect(service.findBySlug('invalid-slug')).rejects.toThrow(NotFoundException);
    });
  });

  // ========================================
  // UPDATE
  // ========================================
  describe('update', () => {
    const updateDto = { name: 'Illustrations Modifiées' };
    const updateSlugDto = { slug: 'existing-slug' };

    it('devrait mettre à jour une catégorie avec succès', async () => {
      // On utilise une copie {...mockCategory}
      categoryRepository.findOne.mockResolvedValueOnce({ ...mockCategory }).mockResolvedValueOnce(null);

      categoryRepository.save.mockImplementation((entity) => Promise.resolve(entity as Category));

      const result = await service.update('category-uuid', updateDto, mockUser);

      expect(result.name).toBe('Illustrations Modifiées');
      expect(categoryRepository.save).toHaveBeenCalled();
    });

    it('devrait mettre à jour le slug', async () => {
      const dto = { slug: 'new-slug' };

      categoryRepository.findOne.mockResolvedValueOnce({ ...mockCategory }).mockResolvedValueOnce(null);

      categoryRepository.save.mockImplementation((entity) => Promise.resolve(entity as Category));

      const result = await service.update('category-uuid', dto, mockUser);

      expect(result.slug).toBe('new-slug');
    });

    it('devrait mettre à jour la position', async () => {
      const dto = { position: 5 };

      categoryRepository.findOne.mockResolvedValueOnce({ ...mockCategory });
      categoryRepository.save.mockImplementation((entity) => Promise.resolve(entity as Category));

      const result = await service.update('category-uuid', dto, mockUser);

      expect(result.position).toBe(5);
    });

    it("devrait lever NotFoundException si la catégorie n'existe pas", async () => {
      categoryRepository.findOne.mockResolvedValue(null);
      await expect(service.update('invalid-uuid', updateDto, mockUser)).rejects.toThrow(NotFoundException);
    });

    // --- CORRECTION CLÉ ICI ---
    it('devrait lever ConflictException si le nouveau nom existe déjà', async () => {
      const existingCategory = { ...mockCategory, id: 'other-uuid', name: updateDto.name };

      categoryRepository.findOne.mockImplementation((options: any) => {
        const where = options?.where || {};

        // 1. Recherche par ID -> Retourne l'entité courante (COPIE)
        if (where.id === 'category-uuid') {
          return Promise.resolve({ ...mockCategory });
        }

        // 2. Recherche par NOM -> Retourne le conflit
        if (where.name === updateDto.name) {
          return Promise.resolve(existingCategory);
        }

        return Promise.resolve(null);
      });

      categoryRepository.save.mockResolvedValue(mockCategory);

      await expect(service.update('category-uuid', updateDto, mockUser)).rejects.toThrow(ConflictException);
    });

    it('devrait lever ConflictException si le nouveau slug existe déjà', async () => {
      const existingCategory = { ...mockCategory, id: 'other-uuid', slug: updateSlugDto.slug };

      categoryRepository.findOne.mockImplementation((options: any) => {
        const where = options?.where || {};

        if (where.id === 'category-uuid') {
          return Promise.resolve({ ...mockCategory });
        }

        if (where.slug === updateSlugDto.slug) {
          return Promise.resolve(existingCategory);
        }

        return Promise.resolve(null);
      });

      categoryRepository.save.mockResolvedValue(mockCategory);

      await expect(service.update('category-uuid', updateSlugDto, mockUser)).rejects.toThrow(ConflictException);
    });

    it('devrait permettre de garder le même nom sans conflit', async () => {
      const sameName = { name: 'Illustrations' };

      categoryRepository.findOne.mockResolvedValueOnce({ ...mockCategory });
      categoryRepository.save.mockImplementation((entity) => Promise.resolve(entity as Category));

      const result = await service.update('category-uuid', sameName, mockUser);

      expect(result).toBeDefined();
    });
  });
  // ========================================
  // DELETE
  // ========================================
  describe('remove', () => {
    it('devrait supprimer une catégorie avec succès', async () => {
      categoryRepository.findOne.mockResolvedValue(mockCategory);
      categoryRepository.remove.mockResolvedValue(mockCategory);

      await service.remove('category-uuid', mockUser);

      expect(categoryRepository.remove).toHaveBeenCalledWith(mockCategory);
      expect(activityLogService.log).toHaveBeenCalled();
    });

    it('devrait supprimer une catégorie avec ses sous-catégories (CASCADE)', async () => {
      categoryRepository.findOne.mockResolvedValue(mockCategoryWithSubcategories);
      categoryRepository.remove.mockResolvedValue(mockCategoryWithSubcategories);

      await service.remove('category-uuid', mockUser);

      expect(categoryRepository.remove).toHaveBeenCalled();
      expect(activityLogService.log).toHaveBeenCalledWith(
        expect.objectContaining({
          metadata: expect.objectContaining({
            subcategoriesCount: 2,
          }),
        }),
      );
    });

    it("devrait lever NotFoundException si la catégorie n'existe pas", async () => {
      categoryRepository.findOne.mockResolvedValue(null);

      await expect(service.remove('invalid-uuid', mockUser)).rejects.toThrow(NotFoundException);
    });
  });
});
