import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ConflictException, NotFoundException } from '@nestjs/common';
import { MaterialsService } from '../services';
import { Material } from '../entities/material.entity';
import { ActivityLogService } from '../../activity-logs';
import { User } from '../../users/entities/user.entity';
import { Role } from '../../roles/entities/role.entity';

// Mock du service d'activité
const mockActivityLogService = {
  log: jest.fn(),
};

// Mock du repository
const mockMaterialRepository = {
  create: jest.fn(),
  save: jest.fn(),
  find: jest.fn(),
  findOne: jest.fn(),
  remove: jest.fn(),
};

// Mock de l'utilisateur
const mockUser = new User();
mockUser.id = 'user-uuid';
mockUser.role = new Role();
mockUser.role.code = 'ADMIN';

/**
 * Helper pour créer un mock Material complet
 */
const createMockMaterial = (overrides: Partial<Material> = {}): Material => {
  return {
    id: 'default-uuid',
    name: 'Default Material',
    description: 'Default description',
    isActive: true,
    createdBy: 'creator-uuid',
    createdByUser: mockUser,
    modifiedBy: null,
    modifiedByUser: undefined,
    createdAt: new Date('2026-01-01'),
    updatedAt: new Date('2026-01-01'),
    ...overrides,
  } as Material;
};

describe('MaterialsService', () => {
  let service: MaterialsService;
  let _repository: Repository<Material>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MaterialsService,
        {
          provide: getRepositoryToken(Material),
          useValue: mockMaterialRepository,
        },
        {
          provide: ActivityLogService,
          useValue: mockActivityLogService,
        },
      ],
    }).compile();

    service = module.get<MaterialsService>(MaterialsService);
    _repository = module.get<Repository<Material>>(getRepositoryToken(Material));
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  // ========================================
  // CREATE
  // ========================================
  describe('create', () => {
    it('should create and save a new material', async () => {
      const createMaterialDto = { name: 'Papier Fine Art', description: 'Papier haut de gamme' };
      const newMaterial = createMockMaterial({
        id: 'material-uuid',
        name: 'Papier Fine Art',
        description: 'Papier haut de gamme',
        createdBy: mockUser.id,
      });

      mockMaterialRepository.findOne.mockResolvedValue(null);
      mockMaterialRepository.create.mockReturnValue(newMaterial);
      mockMaterialRepository.save.mockResolvedValue(newMaterial);

      const result = await service.create(createMaterialDto, mockUser);

      expect(mockMaterialRepository.findOne).toHaveBeenCalledWith({ where: { name: 'Papier Fine Art' } });
      expect(mockMaterialRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({ name: 'Papier Fine Art', description: 'Papier haut de gamme' }),
      );
      expect(mockMaterialRepository.save).toHaveBeenCalledWith(newMaterial);
      expect(mockActivityLogService.log).toHaveBeenCalled();
      expect(result).toEqual(newMaterial);
    });

    it('should create material with default isActive=true', async () => {
      const createMaterialDto = { name: 'Canvas' };
      const newMaterial = createMockMaterial({
        id: 'material-uuid',
        name: 'Canvas',
        isActive: true,
        createdBy: mockUser.id,
      });

      mockMaterialRepository.findOne.mockResolvedValue(null);
      mockMaterialRepository.create.mockReturnValue(newMaterial);
      mockMaterialRepository.save.mockResolvedValue(newMaterial);

      const result = await service.create(createMaterialDto, mockUser);

      expect(result.isActive).toBe(true);
    });

    it('should throw ConflictException if material name already exists', async () => {
      const createMaterialDto = { name: 'Existing Material' };
      const existingMaterial = createMockMaterial({ id: 'existing-uuid', name: 'Existing Material' });

      mockMaterialRepository.findOne.mockResolvedValue(existingMaterial);

      await expect(service.create(createMaterialDto, mockUser)).rejects.toThrow(ConflictException);
      expect(mockMaterialRepository.save).not.toHaveBeenCalled();
    });
  });

  // ========================================
  // FIND ALL
  // ========================================
  describe('findAll', () => {
    it('should return an array of materials ordered by name', async () => {
      const materials = [
        createMockMaterial({ id: '1', name: 'Canvas', isActive: true }),
        createMockMaterial({ id: '2', name: 'Papier Fine Art', isActive: false }),
        createMockMaterial({ id: '3', name: 'Toile', isActive: true }),
      ];

      mockMaterialRepository.find.mockResolvedValue(materials);

      const result = await service.findAll();

      expect(result).toEqual(materials);
      expect(mockMaterialRepository.find).toHaveBeenCalledWith({ order: { name: 'ASC' } });
    });

    it('should return empty array when no materials exist', async () => {
      mockMaterialRepository.find.mockResolvedValue([]);

      const result = await service.findAll();

      expect(result).toEqual([]);
    });
  });

  // ========================================
  // FIND ALL ACTIVE
  // ========================================
  describe('findAllActive', () => {
    it('should return only active materials ordered by name', async () => {
      const activeMaterials = [
        createMockMaterial({ id: '1', name: 'Canvas', isActive: true }),
        createMockMaterial({ id: '3', name: 'Toile', isActive: true }),
      ];

      mockMaterialRepository.find.mockResolvedValue(activeMaterials);

      const result = await service.findAllActive();

      expect(result).toEqual(activeMaterials);
      expect(mockMaterialRepository.find).toHaveBeenCalledWith({
        where: { isActive: true },
        order: { name: 'ASC' },
      });
    });

    it('should return empty array when no active materials exist', async () => {
      mockMaterialRepository.find.mockResolvedValue([]);

      const result = await service.findAllActive();

      expect(result).toEqual([]);
    });
  });

  // ========================================
  // FIND BY ID
  // ========================================
  describe('findById', () => {
    it('should return a single material', async () => {
      const material = createMockMaterial({ id: '1', name: 'Papier Fine Art' });

      mockMaterialRepository.findOne.mockResolvedValue(material);

      const result = await service.findById('1');

      expect(result).toEqual(material);
      expect(mockMaterialRepository.findOne).toHaveBeenCalledWith({ where: { id: '1' } });
    });

    it('should throw NotFoundException if material not found', async () => {
      mockMaterialRepository.findOne.mockResolvedValue(null);

      await expect(service.findById('non-existing-id')).rejects.toThrow(NotFoundException);
    });
  });

  // ========================================
  // UPDATE
  // ========================================
  describe('update', () => {
    it('should update material name', async () => {
      const materialId = 'material-uuid';
      const existingMaterial = createMockMaterial({ id: materialId, name: 'Old Name', description: 'Desc' });
      const updateMaterialDto = { name: 'New Name' };
      const updatedMaterial = createMockMaterial({
        id: materialId,
        name: 'New Name',
        description: 'Desc',
        modifiedBy: mockUser.id,
      });

      mockMaterialRepository.findOne
        .mockResolvedValueOnce(existingMaterial) // findById
        .mockResolvedValueOnce(null); // check name uniqueness

      mockMaterialRepository.save.mockResolvedValue(updatedMaterial);

      const result = await service.update(materialId, updateMaterialDto, mockUser);

      expect(result.name).toBe('New Name');
      expect(mockMaterialRepository.save).toHaveBeenCalled();
      expect(mockActivityLogService.log).toHaveBeenCalledWith(
        expect.objectContaining({
          metadata: expect.objectContaining({
            oldValues: expect.objectContaining({ name: 'Old Name' }),
            newValues: expect.objectContaining({ name: 'New Name' }),
          }),
        }),
      );
    });

    it('should update material isActive status', async () => {
      const materialId = 'material-uuid';
      const existingMaterial = createMockMaterial({ id: materialId, name: 'Material', isActive: true });
      const updateMaterialDto = { isActive: false };
      const updatedMaterial = createMockMaterial({
        id: materialId,
        name: 'Material',
        isActive: false,
        modifiedBy: mockUser.id,
      });

      mockMaterialRepository.findOne.mockResolvedValue(existingMaterial);
      mockMaterialRepository.save.mockResolvedValue(updatedMaterial);

      const result = await service.update(materialId, updateMaterialDto, mockUser);

      expect(result.isActive).toBe(false);
      expect(mockActivityLogService.log).toHaveBeenCalledWith(
        expect.objectContaining({
          metadata: expect.objectContaining({
            oldValues: expect.objectContaining({ isActive: true }),
            newValues: expect.objectContaining({ isActive: false }),
          }),
        }),
      );
    });

    it('should throw NotFoundException if material to update not found', async () => {
      mockMaterialRepository.findOne.mockResolvedValue(null);

      await expect(service.update('non-existing-id', { name: 'New' }, mockUser)).rejects.toThrow(NotFoundException);
      expect(mockMaterialRepository.save).not.toHaveBeenCalled();
    });

    it('should throw ConflictException if new name already exists', async () => {
      const materialId = 'material-uuid';
      const existingMaterial = createMockMaterial({ id: materialId, name: 'Old Name' });
      const anotherMaterial = createMockMaterial({ id: 'other-uuid', name: 'New Name' });

      mockMaterialRepository.findOne
        .mockResolvedValueOnce(existingMaterial) // findById
        .mockResolvedValueOnce(anotherMaterial); // check name uniqueness - found another material

      await expect(service.update(materialId, { name: 'New Name' }, mockUser)).rejects.toThrow(ConflictException);
      expect(mockMaterialRepository.save).not.toHaveBeenCalled();
    });

    it('should not check uniqueness if name is not changed', async () => {
      const materialId = 'material-uuid';
      const existingMaterial = createMockMaterial({ id: materialId, name: 'Same Name', description: 'Old desc' });

      mockMaterialRepository.findOne.mockResolvedValue(existingMaterial);
      mockMaterialRepository.save.mockResolvedValue({
        ...existingMaterial,
        description: 'New desc',
        modifiedBy: mockUser.id,
      });

      await service.update(materialId, { description: 'New desc' }, mockUser);

      // Should only be called once (for findById), not for name uniqueness check
      expect(mockMaterialRepository.findOne).toHaveBeenCalledTimes(1);
    });
  });

  // ========================================
  // REMOVE
  // ========================================
  describe('remove', () => {
    it('should remove a material and log the action', async () => {
      const materialId = 'material-to-delete-uuid';
      const material = createMockMaterial({ id: materialId, name: 'To Delete', description: 'Will be deleted' });

      mockMaterialRepository.findOne.mockResolvedValue(material);
      mockMaterialRepository.remove.mockResolvedValue(undefined);

      await expect(service.remove(materialId, mockUser)).resolves.toBeUndefined();

      expect(mockMaterialRepository.findOne).toHaveBeenCalledWith({ where: { id: materialId } });
      expect(mockActivityLogService.log).toHaveBeenCalledWith(
        expect.objectContaining({
          metadata: expect.objectContaining({
            deletedMaterialName: 'To Delete',
            description: 'Will be deleted',
          }),
        }),
      );
      expect(mockMaterialRepository.remove).toHaveBeenCalledWith(material);
    });

    it('should throw NotFoundException if material to remove is not found', async () => {
      const materialId = 'non-existing-id';

      mockMaterialRepository.findOne.mockResolvedValue(null);

      await expect(service.remove(materialId, mockUser)).rejects.toThrow(NotFoundException);
      expect(mockActivityLogService.log).not.toHaveBeenCalled();
      expect(mockMaterialRepository.remove).not.toHaveBeenCalled();
    });
  });
});
