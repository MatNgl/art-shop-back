import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ConflictException, NotFoundException } from '@nestjs/common';
import { FormatsService } from '../services';
import { Format } from '../entities';
import { ActivityLogService } from '../../activity-logs';
import { User } from '../../users/entities/user.entity';
import { Role } from '../../roles/entities/role.entity';

// Mock du service d'activité
const mockActivityLogService = {
  log: jest.fn(),
};

// Mock du repository
const mockFormatRepository = {
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
 * Helper pour créer un mock Format complet
 */
const createMockFormat = (overrides: Partial<Format> = {}): Format => {
  return {
    id: 'default-uuid',
    name: 'Default Format',
    widthMm: 210,
    heightMm: 297,
    isCustom: false,
    createdBy: 'creator-uuid',
    createdByUser: mockUser,
    modifiedBy: null,
    modifiedByUser: undefined,
    createdAt: new Date('2026-01-01'),
    updatedAt: new Date('2026-01-01'),
    ...overrides,
  } as Format;
};

describe('FormatsService', () => {
  let service: FormatsService;
  let _repository: Repository<Format>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        FormatsService,
        {
          provide: getRepositoryToken(Format),
          useValue: mockFormatRepository,
        },
        {
          provide: ActivityLogService,
          useValue: mockActivityLogService,
        },
      ],
    }).compile();

    service = module.get<FormatsService>(FormatsService);
    _repository = module.get<Repository<Format>>(getRepositoryToken(Format));
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
    it('should create and save a new format', async () => {
      const createFormatDto = { name: 'A4', widthMm: 210, heightMm: 297 };
      const newFormat = createMockFormat({
        id: 'format-uuid',
        name: 'A4',
        widthMm: 210,
        heightMm: 297,
        createdBy: mockUser.id,
      });

      mockFormatRepository.findOne.mockResolvedValue(null);
      mockFormatRepository.create.mockReturnValue(newFormat);
      mockFormatRepository.save.mockResolvedValue(newFormat);

      const result = await service.create(createFormatDto, mockUser);

      expect(mockFormatRepository.findOne).toHaveBeenCalledWith({ where: { name: 'A4' } });
      expect(mockFormatRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({ name: 'A4', widthMm: 210, heightMm: 297 }),
      );
      expect(mockFormatRepository.save).toHaveBeenCalledWith(newFormat);
      expect(mockActivityLogService.log).toHaveBeenCalled();
      expect(result).toMatchObject({
        id: 'format-uuid',
        name: 'A4',
        widthMm: 210,
        heightMm: 297,
      });
    });

    it('should create format with default isCustom=false', async () => {
      const createFormatDto = { name: 'A3', widthMm: 297, heightMm: 420 };
      const newFormat = createMockFormat({
        id: 'format-uuid',
        name: 'A3',
        widthMm: 297,
        heightMm: 420,
        isCustom: false,
        createdBy: mockUser.id,
      });

      mockFormatRepository.findOne.mockResolvedValue(null);
      mockFormatRepository.create.mockReturnValue(newFormat);
      mockFormatRepository.save.mockResolvedValue(newFormat);

      const result = await service.create(createFormatDto, mockUser);

      expect(result.isCustom).toBe(false);
    });

    it('should throw ConflictException if format name already exists', async () => {
      const createFormatDto = { name: 'Existing Format', widthMm: 100, heightMm: 100 };
      const existingFormat = createMockFormat({ id: 'existing-uuid', name: 'Existing Format' });

      mockFormatRepository.findOne.mockResolvedValue(existingFormat);

      await expect(service.create(createFormatDto, mockUser)).rejects.toThrow(ConflictException);
      expect(mockFormatRepository.save).not.toHaveBeenCalled();
    });

    it('should log format creation with dimensions string', async () => {
      const createFormatDto = { name: 'Carré', widthMm: 300, heightMm: 300 };
      const newFormat = createMockFormat({
        id: 'format-uuid',
        name: 'Carré',
        widthMm: 300,
        heightMm: 300,
        createdBy: mockUser.id,
      });

      mockFormatRepository.findOne.mockResolvedValue(null);
      mockFormatRepository.create.mockReturnValue(newFormat);
      mockFormatRepository.save.mockResolvedValue(newFormat);

      await service.create(createFormatDto, mockUser);

      expect(mockActivityLogService.log).toHaveBeenCalledWith(
        expect.objectContaining({
          metadata: expect.objectContaining({
            formatName: 'Carré',
            dimensions: '300x300mm',
          }),
        }),
      );
    });
  });

  // ========================================
  // FIND ALL
  // ========================================
  describe('findAll', () => {
    it('should return an array of format DTOs ordered by name', async () => {
      const formats = [
        createMockFormat({ id: '1', name: 'A3', widthMm: 297, heightMm: 420 }),
        createMockFormat({ id: '2', name: 'A4', widthMm: 210, heightMm: 297 }),
        createMockFormat({ id: '3', name: 'Carré', widthMm: 300, heightMm: 300, isCustom: true }),
      ];

      mockFormatRepository.find.mockResolvedValue(formats);

      const result = await service.findAll();

      expect(result).toHaveLength(3);
      expect(result[0]).toMatchObject({ id: '1', name: 'A3' });
      expect(result[1]).toMatchObject({ id: '2', name: 'A4' });
      expect(mockFormatRepository.find).toHaveBeenCalledWith({ order: { name: 'ASC' } });
    });

    it('should return empty array when no formats exist', async () => {
      mockFormatRepository.find.mockResolvedValue([]);

      const result = await service.findAll();

      expect(result).toEqual([]);
    });

    it('should return DTOs without internal fields (createdBy, modifiedBy)', async () => {
      const format = createMockFormat({ id: '1', name: 'A4', createdBy: 'internal-user-id' });

      mockFormatRepository.find.mockResolvedValue([format]);

      const result = await service.findAll();

      expect(result[0]).not.toHaveProperty('createdBy');
      expect(result[0]).not.toHaveProperty('modifiedBy');
      expect(result[0]).toHaveProperty('id');
      expect(result[0]).toHaveProperty('name');
      expect(result[0]).toHaveProperty('widthMm');
      expect(result[0]).toHaveProperty('heightMm');
      expect(result[0]).toHaveProperty('isCustom');
      expect(result[0]).toHaveProperty('createdAt');
      expect(result[0]).toHaveProperty('updatedAt');
    });
  });

  // ========================================
  // FIND BY ID
  // ========================================
  describe('findById', () => {
    it('should return a format DTO', async () => {
      const format = createMockFormat({ id: '1', name: 'A4', widthMm: 210, heightMm: 297 });

      mockFormatRepository.findOne.mockResolvedValue(format);

      const result = await service.findById('1');

      expect(result).toMatchObject({
        id: '1',
        name: 'A4',
        widthMm: 210,
        heightMm: 297,
      });
      expect(mockFormatRepository.findOne).toHaveBeenCalledWith({ where: { id: '1' } });
    });

    it('should throw NotFoundException if format not found', async () => {
      mockFormatRepository.findOne.mockResolvedValue(null);

      await expect(service.findById('non-existing-id')).rejects.toThrow(NotFoundException);
    });
  });

  // ========================================
  // UPDATE
  // ========================================
  describe('update', () => {
    it('should update format name', async () => {
      const formatId = 'format-uuid';
      const existingFormat = createMockFormat({ id: formatId, name: 'Old Name', widthMm: 210, heightMm: 297 });
      const updateFormatDto = { name: 'New Name' };
      const updatedFormat = createMockFormat({
        id: formatId,
        name: 'New Name',
        widthMm: 210,
        heightMm: 297,
        modifiedBy: mockUser.id,
      });

      mockFormatRepository.findOne
        .mockResolvedValueOnce(existingFormat) // findEntityById
        .mockResolvedValueOnce(null); // check name uniqueness

      mockFormatRepository.save.mockResolvedValue(updatedFormat);

      const result = await service.update(formatId, updateFormatDto, mockUser);

      expect(result.name).toBe('New Name');
      expect(mockFormatRepository.save).toHaveBeenCalled();
    });

    it('should update format dimensions', async () => {
      const formatId = 'format-uuid';
      const existingFormat = createMockFormat({ id: formatId, name: 'Custom', widthMm: 100, heightMm: 100 });
      const updateFormatDto = { widthMm: 200, heightMm: 300 };
      const updatedFormat = createMockFormat({
        id: formatId,
        name: 'Custom',
        widthMm: 200,
        heightMm: 300,
        modifiedBy: mockUser.id,
      });

      mockFormatRepository.findOne.mockResolvedValue(existingFormat);
      mockFormatRepository.save.mockResolvedValue(updatedFormat);

      const result = await service.update(formatId, updateFormatDto, mockUser);

      expect(result.widthMm).toBe(200);
      expect(result.heightMm).toBe(300);
      expect(mockActivityLogService.log).toHaveBeenCalledWith(
        expect.objectContaining({
          metadata: expect.objectContaining({
            oldValues: expect.objectContaining({ widthMm: 100, heightMm: 100 }),
            newValues: expect.objectContaining({ widthMm: 200, heightMm: 300 }),
          }),
        }),
      );
    });

    it('should update format isCustom status', async () => {
      const formatId = 'format-uuid';
      const existingFormat = createMockFormat({ id: formatId, name: 'A4', isCustom: false });
      const updateFormatDto = { isCustom: true };
      const updatedFormat = createMockFormat({
        id: formatId,
        name: 'A4',
        isCustom: true,
        modifiedBy: mockUser.id,
      });

      mockFormatRepository.findOne.mockResolvedValue(existingFormat);
      mockFormatRepository.save.mockResolvedValue(updatedFormat);

      const result = await service.update(formatId, updateFormatDto, mockUser);

      expect(result.isCustom).toBe(true);
      expect(mockActivityLogService.log).toHaveBeenCalledWith(
        expect.objectContaining({
          metadata: expect.objectContaining({
            oldValues: expect.objectContaining({ isCustom: false }),
            newValues: expect.objectContaining({ isCustom: true }),
          }),
        }),
      );
    });

    it('should throw NotFoundException if format to update not found', async () => {
      mockFormatRepository.findOne.mockResolvedValue(null);

      await expect(service.update('non-existing-id', { name: 'New' }, mockUser)).rejects.toThrow(NotFoundException);
      expect(mockFormatRepository.save).not.toHaveBeenCalled();
    });

    it('should throw ConflictException if new name already exists', async () => {
      const formatId = 'format-uuid';
      const existingFormat = createMockFormat({ id: formatId, name: 'Old Name' });
      const anotherFormat = createMockFormat({ id: 'other-uuid', name: 'New Name' });

      mockFormatRepository.findOne
        .mockResolvedValueOnce(existingFormat) // findEntityById
        .mockResolvedValueOnce(anotherFormat); // check name uniqueness - found another format

      await expect(service.update(formatId, { name: 'New Name' }, mockUser)).rejects.toThrow(ConflictException);
      expect(mockFormatRepository.save).not.toHaveBeenCalled();
    });

    it('should not check uniqueness if name is not changed', async () => {
      const formatId = 'format-uuid';
      const existingFormat = createMockFormat({ id: formatId, name: 'Same Name', widthMm: 100, heightMm: 100 });
      const updatedFormat = createMockFormat({
        ...existingFormat,
        widthMm: 200,
        modifiedBy: mockUser.id,
      });

      mockFormatRepository.findOne.mockResolvedValue(existingFormat);
      mockFormatRepository.save.mockResolvedValue(updatedFormat);

      await service.update(formatId, { widthMm: 200 }, mockUser);

      // Should only be called once (for findEntityById)
      expect(mockFormatRepository.findOne).toHaveBeenCalledTimes(1);
    });
  });

  // ========================================
  // REMOVE
  // ========================================
  describe('remove', () => {
    it('should remove a format and log the action with dimensions', async () => {
      const formatId = 'format-to-delete-uuid';
      const format = createMockFormat({ id: formatId, name: 'To Delete', widthMm: 100, heightMm: 100 });

      mockFormatRepository.findOne.mockResolvedValue(format);
      mockFormatRepository.remove.mockResolvedValue(undefined);

      await expect(service.remove(formatId, mockUser)).resolves.toBeUndefined();

      expect(mockFormatRepository.findOne).toHaveBeenCalledWith({ where: { id: formatId } });
      expect(mockActivityLogService.log).toHaveBeenCalledWith(
        expect.objectContaining({
          metadata: expect.objectContaining({
            deletedFormatName: 'To Delete',
            widthMm: 100,
            heightMm: 100,
          }),
        }),
      );
      expect(mockFormatRepository.remove).toHaveBeenCalledWith(format);
    });

    it('should throw NotFoundException if format to remove is not found', async () => {
      const formatId = 'non-existing-id';

      mockFormatRepository.findOne.mockResolvedValue(null);

      await expect(service.remove(formatId, mockUser)).rejects.toThrow(NotFoundException);
      expect(mockActivityLogService.log).not.toHaveBeenCalled();
      expect(mockFormatRepository.remove).not.toHaveBeenCalled();
    });
  });
});
