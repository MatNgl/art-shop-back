import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ConflictException, NotFoundException } from '@nestjs/common';
import { TagsService } from '../services';
import { Tag } from '../entities/tag.entity';
import { ActivityLogService } from '../../activity-logs';
import { User } from '../../users/entities/user.entity';
import { Role } from '../../roles/entities/role.entity';

// Mock du service d'activité
const mockActivityLogService = {
  log: jest.fn(),
};

// Mock du repository
const mockTagRepository = {
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
 * Helper pour créer un mock Tag complet
 */
const createMockTag = (overrides: Partial<Tag> = {}): Tag => {
  return {
    id: 'default-uuid',
    name: 'Default Tag',
    slug: 'default-tag',
    createdBy: 'creator-uuid',
    createdByUser: mockUser,
    modifiedBy: null,
    modifiedByUser: undefined,
    createdAt: new Date('2026-01-01'),
    updatedAt: new Date('2026-01-01'),
    ...overrides,
  } as Tag;
};

describe('TagsService', () => {
  let service: TagsService;
  let _repository: Repository<Tag>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TagsService,
        {
          provide: getRepositoryToken(Tag),
          useValue: mockTagRepository,
        },
        {
          provide: ActivityLogService,
          useValue: mockActivityLogService,
        },
      ],
    }).compile();

    service = module.get<TagsService>(TagsService);
    _repository = module.get<Repository<Tag>>(getRepositoryToken(Tag));
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
    it('should create and save a new tag', async () => {
      const createTagDto = { name: 'New Tag' };
      const newTag = createMockTag({ id: 'tag-uuid', name: 'New Tag', slug: 'new-tag', createdBy: mockUser.id });

      mockTagRepository.findOne.mockResolvedValue(null);
      mockTagRepository.create.mockReturnValue(newTag);
      mockTagRepository.save.mockResolvedValue(newTag);

      const result = await service.create(createTagDto, mockUser);

      expect(mockTagRepository.findOne).toHaveBeenCalledWith({ where: { name: 'New Tag' } });
      expect(mockTagRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({ name: 'New Tag', slug: 'new-tag' }),
      );
      expect(mockTagRepository.save).toHaveBeenCalledWith(newTag);
      expect(mockActivityLogService.log).toHaveBeenCalled();
      expect(result).toEqual(newTag);
    });

    it('should throw ConflictException if tag name already exists', async () => {
      const createTagDto = { name: 'Existing Tag' };
      const existingTag = createMockTag({ id: 'tag-uuid', name: 'Existing Tag', slug: 'existing-tag' });

      mockTagRepository.findOne.mockResolvedValue(existingTag);

      await expect(service.create(createTagDto, mockUser)).rejects.toThrow(ConflictException);
      expect(mockTagRepository.save).not.toHaveBeenCalled();
    });

    it('should throw ConflictException if generated slug already exists', async () => {
      const createTagDto = { name: 'New Tag' };

      mockTagRepository.findOne
        .mockResolvedValueOnce(null) // name check
        .mockResolvedValueOnce(createMockTag({ id: 'other-uuid', slug: 'new-tag' })); // slug check

      await expect(service.create(createTagDto, mockUser)).rejects.toThrow(ConflictException);
      expect(mockTagRepository.save).not.toHaveBeenCalled();
    });

    it('should generate correct slug from name with accents and special chars', async () => {
      const createTagDto = { name: 'Été & Paysages' };
      const expectedSlug = 'ete-paysages';
      const newTag = createMockTag({
        id: 'tag-uuid',
        name: 'Été & Paysages',
        slug: expectedSlug,
        createdBy: mockUser.id,
      });

      mockTagRepository.findOne.mockResolvedValue(null);
      mockTagRepository.create.mockReturnValue(newTag);
      mockTagRepository.save.mockResolvedValue(newTag);

      await service.create(createTagDto, mockUser);

      expect(mockTagRepository.create).toHaveBeenCalledWith(expect.objectContaining({ slug: expectedSlug }));
    });
  });

  // ========================================
  // FIND ALL
  // ========================================
  describe('findAll', () => {
    it('should return an array of tags ordered by name', async () => {
      const tags = [
        createMockTag({ id: '1', name: 'Abstrait', slug: 'abstrait' }),
        createMockTag({ id: '2', name: 'Japon', slug: 'japon' }),
      ];

      mockTagRepository.find.mockResolvedValue(tags);

      const result = await service.findAll();

      expect(result).toEqual(tags);
      expect(mockTagRepository.find).toHaveBeenCalledWith({ order: { name: 'ASC' } });
    });

    it('should return empty array when no tags exist', async () => {
      mockTagRepository.find.mockResolvedValue([]);

      const result = await service.findAll();

      expect(result).toEqual([]);
    });
  });

  // ========================================
  // FIND BY ID
  // ========================================
  describe('findById', () => {
    it('should return a single tag', async () => {
      const tag = createMockTag({ id: '1', name: 'Test Tag', slug: 'test-tag' });

      mockTagRepository.findOne.mockResolvedValue(tag);

      const result = await service.findById('1');

      expect(result).toEqual(tag);
      expect(mockTagRepository.findOne).toHaveBeenCalledWith({ where: { id: '1' } });
    });

    it('should throw NotFoundException if tag not found', async () => {
      mockTagRepository.findOne.mockResolvedValue(null);

      await expect(service.findById('non-existing-id')).rejects.toThrow(NotFoundException);
    });
  });

  // ========================================
  // FIND BY SLUG
  // ========================================
  describe('findBySlug', () => {
    it('should return a tag by slug', async () => {
      const tag = createMockTag({ id: '1', name: 'Japon', slug: 'japon' });

      mockTagRepository.findOne.mockResolvedValue(tag);

      const result = await service.findBySlug('japon');

      expect(result).toEqual(tag);
      expect(mockTagRepository.findOne).toHaveBeenCalledWith({ where: { slug: 'japon' } });
    });

    it('should throw NotFoundException if slug not found', async () => {
      mockTagRepository.findOne.mockResolvedValue(null);

      await expect(service.findBySlug('non-existing-slug')).rejects.toThrow(NotFoundException);
    });
  });

  // ========================================
  // UPDATE
  // ========================================
  describe('update', () => {
    it('should update tag name and regenerate slug', async () => {
      const tagId = 'tag-uuid';
      const existingTag = createMockTag({ id: tagId, name: 'Old Name', slug: 'old-name' });
      const updateTagDto = { name: 'New Name' };
      const updatedTag = createMockTag({
        id: tagId,
        name: 'New Name',
        slug: 'new-name',
        modifiedBy: mockUser.id,
      });

      mockTagRepository.findOne
        .mockResolvedValueOnce(existingTag) // findById
        .mockResolvedValueOnce(null) // check name uniqueness
        .mockResolvedValueOnce(null); // check slug uniqueness

      mockTagRepository.save.mockResolvedValue(updatedTag);

      const result = await service.update(tagId, updateTagDto, mockUser);

      expect(result.name).toBe('New Name');
      expect(mockTagRepository.save).toHaveBeenCalled();
      expect(mockActivityLogService.log).toHaveBeenCalledWith(
        expect.objectContaining({
          metadata: expect.objectContaining({
            oldValues: expect.objectContaining({ name: 'Old Name' }),
            newValues: expect.objectContaining({ name: 'New Name' }),
          }),
        }),
      );
    });

    it('should throw NotFoundException if tag to update not found', async () => {
      mockTagRepository.findOne.mockResolvedValue(null);

      await expect(service.update('non-existing-id', { name: 'New' }, mockUser)).rejects.toThrow(NotFoundException);
      expect(mockTagRepository.save).not.toHaveBeenCalled();
    });

    it('should throw ConflictException if new name already exists', async () => {
      const tagId = 'tag-uuid';
      const existingTag = createMockTag({ id: tagId, name: 'Old Name', slug: 'old-name' });
      const anotherTag = createMockTag({ id: 'other-uuid', name: 'New Name', slug: 'new-name' });

      mockTagRepository.findOne
        .mockResolvedValueOnce(existingTag) // findById
        .mockResolvedValueOnce(anotherTag); // check name uniqueness - found another tag

      await expect(service.update(tagId, { name: 'New Name' }, mockUser)).rejects.toThrow(ConflictException);
      expect(mockTagRepository.save).not.toHaveBeenCalled();
    });

    it('should not regenerate slug if name is not changed', async () => {
      const tagId = 'tag-uuid';
      const existingTag = createMockTag({ id: tagId, name: 'Same Name', slug: 'same-name' });

      mockTagRepository.findOne.mockResolvedValue(existingTag);
      mockTagRepository.save.mockResolvedValue({ ...existingTag, modifiedBy: mockUser.id });

      await service.update(tagId, {}, mockUser);

      // Should only be called once (for findById)
      expect(mockTagRepository.findOne).toHaveBeenCalledTimes(1);
    });
  });

  // ========================================
  // REMOVE
  // ========================================
  describe('remove', () => {
    it('should remove a tag and log the action', async () => {
      const tagId = 'tag-to-delete-uuid';
      const tag = createMockTag({ id: tagId, name: 'To Delete', slug: 'to-delete' });

      mockTagRepository.findOne.mockResolvedValue(tag);
      mockTagRepository.remove.mockResolvedValue(undefined);

      await expect(service.remove(tagId, mockUser)).resolves.toBeUndefined();

      expect(mockTagRepository.findOne).toHaveBeenCalledWith({ where: { id: tagId } });
      expect(mockActivityLogService.log).toHaveBeenCalledWith(
        expect.objectContaining({
          metadata: expect.objectContaining({
            deletedTagName: 'To Delete',
            deletedTagSlug: 'to-delete',
          }),
        }),
      );
      expect(mockTagRepository.remove).toHaveBeenCalledWith(tag);
    });

    it('should throw NotFoundException if tag to remove is not found', async () => {
      const tagId = 'non-existing-id';

      mockTagRepository.findOne.mockResolvedValue(null);

      await expect(service.remove(tagId, mockUser)).rejects.toThrow(NotFoundException);
      expect(mockActivityLogService.log).not.toHaveBeenCalled();
      expect(mockTagRepository.remove).not.toHaveBeenCalled();
    });
  });
});
