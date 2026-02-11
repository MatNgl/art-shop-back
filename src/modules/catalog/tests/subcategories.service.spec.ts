import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ConflictException, NotFoundException } from '@nestjs/common';
import { SubcategoriesService } from '../services';
import { Subcategory } from '../entities/subcategory.entity';
import { Category } from '../entities/category.entity';
import { ActivityLogService } from '../../activity-logs';
import { User } from '../../users/entities/user.entity';
import { Role } from '../../roles/entities/role.entity';

describe('SubcategoriesService', () => {
  let service: SubcategoriesService;
  let subcategoryRepository: jest.Mocked<Repository<Subcategory>>;
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

  const mockSubcategory: Subcategory = {
    id: 'subcategory-uuid',
    name: 'Japon',
    slug: 'japon',
    position: 0,
    categoryId: mockCategory.id,
    category: mockCategory,
    createdBy: mockUser.id,
    createdByUser: mockUser,
    createdAt: new Date(),
    updatedAt: new Date(),
  } as Subcategory;

  // ========================================
  // Setup
  // ========================================
  beforeEach(async () => {
    const mockSubcategoryRepository = {
      create: jest.fn(),
      save: jest.fn(),
      find: jest.fn(),
      findOne: jest.fn(),
      remove: jest.fn(),
    };

    const mockCategoryRepository = {
      findOne: jest.fn(),
    };

    const mockActivityLogService = {
      log: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SubcategoriesService,
        {
          provide: getRepositoryToken(Subcategory),
          useValue: mockSubcategoryRepository,
        },
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

    service = module.get<SubcategoriesService>(SubcategoriesService);
    subcategoryRepository = module.get(getRepositoryToken(Subcategory));
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
    const createDto = { name: 'Japon', position: 0 };

    it('devrait créer une sous-catégorie avec succès', async () => {
      categoryRepository.findOne.mockResolvedValue(mockCategory);
      subcategoryRepository.findOne.mockResolvedValue(null);
      subcategoryRepository.create.mockReturnValue(mockSubcategory);
      subcategoryRepository.save.mockResolvedValue(mockSubcategory);

      const result = await service.create('category-uuid', createDto, mockUser);

      expect(result).toBeDefined();
      expect(result.name).toBe('Japon');
      expect(result.slug).toBe('japon');
      expect(result.categoryId).toBe('category-uuid');
      expect(subcategoryRepository.create).toHaveBeenCalled();
      expect(subcategoryRepository.save).toHaveBeenCalled();
      expect(activityLogService.log).toHaveBeenCalled();
    });

    it('devrait créer une sous-catégorie avec un slug personnalisé', async () => {
      const dtoWithSlug = { ...createDto, slug: 'custom-slug' };
      const subcategoryWithCustomSlug = { ...mockSubcategory, slug: 'custom-slug' };

      categoryRepository.findOne.mockResolvedValue(mockCategory);
      subcategoryRepository.findOne.mockResolvedValue(null);
      subcategoryRepository.create.mockReturnValue(subcategoryWithCustomSlug);
      subcategoryRepository.save.mockResolvedValue(subcategoryWithCustomSlug);

      const result = await service.create('category-uuid', dtoWithSlug, mockUser);

      expect(result.slug).toBe('custom-slug');
    });

    it('devrait générer automatiquement le slug si non fourni', async () => {
      const dtoWithAccents = { name: 'Été Français', position: 0 };

      categoryRepository.findOne.mockResolvedValue(mockCategory);
      subcategoryRepository.findOne.mockResolvedValue(null);
      subcategoryRepository.create.mockReturnValue({
        ...mockSubcategory,
        name: dtoWithAccents.name,
        slug: 'ete-francais',
      });
      subcategoryRepository.save.mockResolvedValue({
        ...mockSubcategory,
        name: dtoWithAccents.name,
        slug: 'ete-francais',
      });
      await service.create('category-uuid', dtoWithAccents, mockUser);

      expect(subcategoryRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          slug: 'ete-francais',
        }),
      );
    });

    it("devrait lever NotFoundException si la catégorie parente n'existe pas", async () => {
      categoryRepository.findOne.mockResolvedValue(null);

      await expect(service.create('invalid-category-uuid', createDto, mockUser)).rejects.toThrow(NotFoundException);
    });

    it('devrait lever ConflictException si le slug existe déjà (global)', async () => {
      categoryRepository.findOne.mockResolvedValue(mockCategory);
      subcategoryRepository.findOne.mockResolvedValueOnce(mockSubcategory); // slug check

      await expect(service.create('category-uuid', createDto, mockUser)).rejects.toThrow(ConflictException);
    });

    it('devrait lever ConflictException si le nom existe déjà dans la catégorie', async () => {
      categoryRepository.findOne.mockResolvedValue(mockCategory);
      subcategoryRepository.findOne
        .mockResolvedValueOnce(null) // slug check
        .mockResolvedValueOnce(mockSubcategory); // name check

      await expect(service.create('category-uuid', createDto, mockUser)).rejects.toThrow(ConflictException);
    });
  });

  // ========================================
  // READ ALL BY CATEGORY
  // ========================================
  describe('findAllByCategory', () => {
    it("devrait retourner les sous-catégories d'une catégorie", async () => {
      const subcategories: Subcategory[] = [
        mockSubcategory,
        { ...mockSubcategory, id: 'sub-2', name: 'Nature', slug: 'nature' },
      ];

      categoryRepository.findOne.mockResolvedValue(mockCategory);
      subcategoryRepository.find.mockResolvedValue(subcategories);

      const result = await service.findAllByCategory('category-uuid');

      expect(result).toHaveLength(2);
      expect(subcategoryRepository.find).toHaveBeenCalledWith({
        where: { categoryId: 'category-uuid' },
        order: { position: 'ASC', name: 'ASC' },
      });
    });

    it('devrait retourner un tableau vide si aucune sous-catégorie', async () => {
      categoryRepository.findOne.mockResolvedValue(mockCategory);
      subcategoryRepository.find.mockResolvedValue([]);

      const result = await service.findAllByCategory('category-uuid');

      expect(result).toEqual([]);
    });

    it("devrait lever NotFoundException si la catégorie n'existe pas", async () => {
      categoryRepository.findOne.mockResolvedValue(null);

      await expect(service.findAllByCategory('invalid-category-uuid')).rejects.toThrow(NotFoundException);
    });
  });

  // ========================================
  // READ ALL (GLOBAL)
  // ========================================
  describe('findAll', () => {
    it('devrait retourner toutes les sous-catégories avec leurs catégories', async () => {
      const subcategories: Subcategory[] = [
        mockSubcategory,
        { ...mockSubcategory, id: 'sub-2', name: 'Nature', slug: 'nature' },
      ];

      subcategoryRepository.find.mockResolvedValue(subcategories);

      const result = await service.findAll();

      expect(result).toHaveLength(2);
      expect(subcategoryRepository.find).toHaveBeenCalledWith({
        relations: ['category'],
        order: { position: 'ASC', name: 'ASC' },
      });
    });
  });

  // ========================================
  // READ ONE
  // ========================================
  describe('findById', () => {
    it('devrait retourner une sous-catégorie par ID', async () => {
      subcategoryRepository.findOne.mockResolvedValue(mockSubcategory);

      const result = await service.findById('subcategory-uuid');

      expect(result).toBeDefined();
      expect(result.id).toBe('subcategory-uuid');
      expect(subcategoryRepository.findOne).toHaveBeenCalledWith({
        where: { id: 'subcategory-uuid' },
      });
    });

    it("devrait lever NotFoundException si la sous-catégorie n'existe pas", async () => {
      subcategoryRepository.findOne.mockResolvedValue(null);

      await expect(service.findById('invalid-uuid')).rejects.toThrow(NotFoundException);
    });
  });

  describe('findByIdWithCategory', () => {
    it('devrait retourner une sous-catégorie avec sa catégorie', async () => {
      subcategoryRepository.findOne.mockResolvedValue(mockSubcategory);

      const result = await service.findByIdWithCategory('subcategory-uuid');

      expect(result.category).toBeDefined();
      expect(result.category.name).toBe('Illustrations');
      expect(subcategoryRepository.findOne).toHaveBeenCalledWith({
        where: { id: 'subcategory-uuid' },
        relations: ['category'],
      });
    });

    it("devrait lever NotFoundException si la sous-catégorie n'existe pas", async () => {
      subcategoryRepository.findOne.mockResolvedValue(null);

      await expect(service.findByIdWithCategory('invalid-uuid')).rejects.toThrow(NotFoundException);
    });
  });

  describe('findBySlug', () => {
    it('devrait retourner une sous-catégorie par slug', async () => {
      subcategoryRepository.findOne.mockResolvedValue(mockSubcategory);

      const result = await service.findBySlug('japon');

      expect(result).toBeDefined();
      expect(result.slug).toBe('japon');
      expect(subcategoryRepository.findOne).toHaveBeenCalledWith({
        where: { slug: 'japon' },
        relations: ['category'],
      });
    });

    it("devrait lever NotFoundException si le slug n'existe pas", async () => {
      subcategoryRepository.findOne.mockResolvedValue(null);

      await expect(service.findBySlug('invalid-slug')).rejects.toThrow(NotFoundException);
    });
  });

  // ========================================
  // UPDATE
  // ========================================
  describe('update', () => {
    // On définit les DTOs ici pour qu'ils soient propres à chaque test
    const updateDto = { name: 'Japon Modifié' };
    const updateSlugDto = { slug: 'existing-slug' };

    it('devrait mettre à jour une sous-catégorie avec succès', async () => {
      // IMPORTANT : On renvoie une copie {...mockSubcategory} pour éviter la mutation de l'original
      subcategoryRepository.findOne
        .mockResolvedValueOnce({ ...mockSubcategory }) // find by ID
        .mockResolvedValueOnce(null); // check name uniqueness

      // On mock save pour qu'il renvoie l'objet modifié
      subcategoryRepository.save.mockImplementation((entity) => Promise.resolve(entity as Subcategory));

      const result = await service.update('subcategory-uuid', updateDto, mockUser);

      expect(result.name).toBe('Japon Modifié');
      expect(subcategoryRepository.save).toHaveBeenCalled();
    });

    it('devrait mettre à jour le slug', async () => {
      const dto = { slug: 'new-slug' };

      subcategoryRepository.findOne
        .mockResolvedValueOnce({ ...mockSubcategory }) // find by ID
        .mockResolvedValueOnce(null); // check slug uniqueness

      subcategoryRepository.save.mockImplementation((entity) => Promise.resolve(entity as Subcategory));

      const result = await service.update('subcategory-uuid', dto, mockUser);

      expect(result.slug).toBe('new-slug');
    });

    it('devrait mettre à jour la position', async () => {
      const dto = { position: 5 };

      subcategoryRepository.findOne.mockResolvedValueOnce({ ...mockSubcategory });
      subcategoryRepository.save.mockImplementation((entity) => Promise.resolve(entity as Subcategory));

      const result = await service.update('subcategory-uuid', dto, mockUser);

      expect(result.position).toBe(5);
    });

    it("devrait lever NotFoundException si la sous-catégorie n'existe pas", async () => {
      subcategoryRepository.findOne.mockResolvedValue(null);
      await expect(service.update('invalid-uuid', updateDto, mockUser)).rejects.toThrow(NotFoundException);
    });

    // --- CORRECTION CLÉ ICI ---
    it('devrait lever ConflictException si le nouveau nom existe déjà dans la catégorie', async () => {
      const existingSubcategory = { ...mockSubcategory, id: 'other-uuid', name: updateDto.name };

      // Mock intelligent basé sur les arguments
      subcategoryRepository.findOne.mockImplementation((options: any) => {
        const where = options?.where || {};

        // 1. Si on cherche par ID -> C'est la sous-catégorie qu'on veut modifier
        if (where.id === 'subcategory-uuid') {
          return Promise.resolve({ ...mockSubcategory });
        }

        // 2. Si on cherche par NOM -> C'est le conflit
        if (where.name === updateDto.name) {
          return Promise.resolve(existingSubcategory);
        }

        return Promise.resolve(null);
      });

      // Sécurité : même si ça passait (ce qui ne devrait pas), save renvoie quelque chose pour éviter le crash TypeError
      subcategoryRepository.save.mockResolvedValue(mockSubcategory);

      await expect(service.update('subcategory-uuid', updateDto, mockUser)).rejects.toThrow(ConflictException);
    });

    it('devrait lever ConflictException si le nouveau slug existe déjà', async () => {
      const existingSubcategory = { ...mockSubcategory, id: 'other-uuid', slug: updateSlugDto.slug };

      subcategoryRepository.findOne.mockImplementation((options: any) => {
        const where = options?.where || {};

        // 1. Recherche par ID
        if (where.id === 'subcategory-uuid') {
          return Promise.resolve({ ...mockSubcategory });
        }

        // 2. Recherche par SLUG -> Conflit
        if (where.slug === updateSlugDto.slug) {
          return Promise.resolve(existingSubcategory);
        }

        return Promise.resolve(null);
      });

      subcategoryRepository.save.mockResolvedValue(mockSubcategory);

      await expect(service.update('subcategory-uuid', updateSlugDto, mockUser)).rejects.toThrow(ConflictException);
    });

    it('devrait permettre de garder le même nom sans conflit', async () => {
      const sameName = { name: 'Japon' }; // Le nom actuel dans mockSubcategory est 'Japon'

      subcategoryRepository.findOne.mockResolvedValueOnce({ ...mockSubcategory });
      subcategoryRepository.save.mockImplementation((entity) => Promise.resolve(entity as Subcategory));

      const result = await service.update('subcategory-uuid', sameName, mockUser);
      expect(result).toBeDefined();
    });
  });

  // ========================================
  // DELETE
  // ========================================
  describe('remove', () => {
    it('devrait supprimer une sous-catégorie avec succès', async () => {
      subcategoryRepository.findOne.mockResolvedValue(mockSubcategory);
      subcategoryRepository.remove.mockResolvedValue(mockSubcategory);

      await service.remove('subcategory-uuid', mockUser);

      expect(subcategoryRepository.remove).toHaveBeenCalledWith(mockSubcategory);
      expect(activityLogService.log).toHaveBeenCalled();
    });

    it('devrait logger les métadonnées de la catégorie parente', async () => {
      subcategoryRepository.findOne.mockResolvedValue(mockSubcategory);
      subcategoryRepository.remove.mockResolvedValue(mockSubcategory);

      await service.remove('subcategory-uuid', mockUser);

      expect(activityLogService.log).toHaveBeenCalledWith(
        expect.objectContaining({
          metadata: expect.objectContaining({
            categoryId: mockCategory.id,
            categoryName: mockCategory.name,
          }),
        }),
      );
    });

    it("devrait lever NotFoundException si la sous-catégorie n'existe pas", async () => {
      subcategoryRepository.findOne.mockResolvedValue(null);

      await expect(service.remove('invalid-uuid', mockUser)).rejects.toThrow(NotFoundException);
    });
  });
});
