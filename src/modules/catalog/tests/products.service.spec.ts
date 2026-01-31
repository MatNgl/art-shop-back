import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { ConflictException, NotFoundException } from '@nestjs/common';
import { ProductsService } from '../services';
import { Product, ProductStatus } from '../entities/product.entity';
import { Tag } from '../entities/tag.entity';
import { ActivityLogService } from '../../activity-logs';
import { User } from '../../users/entities/user.entity';
import { Role } from '../../roles/entities/role.entity';

// Mock du service d'activité
const mockActivityLogService = {
  log: jest.fn(),
};

// Mock du repository Product
const mockProductRepository = {
  create: jest.fn(),
  save: jest.fn(),
  find: jest.fn(),
  findOne: jest.fn(),
  remove: jest.fn(),
};

// Mock du repository Tag
const mockTagRepository = {
  find: jest.fn(),
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
    id: 'tag-uuid',
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

/**
 * Helper pour créer un mock Product complet
 */
const createMockProduct = (overrides: Partial<Product> = {}): Product => {
  return {
    id: 'default-uuid',
    name: 'Default Product',
    slug: 'default-product',
    description: 'Default description',
    shortDescription: null,
    status: ProductStatus.DRAFT,
    featured: false,
    seoTitle: null,
    seoDescription: null,
    tags: [],
    variants: [],
    images: [],
    createdBy: 'creator-uuid',
    createdByUser: mockUser,
    modifiedBy: null,
    modifiedByUser: undefined,
    createdAt: new Date('2026-01-01'),
    updatedAt: new Date('2026-01-01'),
    ...overrides,
  } as Product;
};

describe('ProductsService', () => {
  let service: ProductsService;
  let _productRepository: Repository<Product>;
  let _tagRepository: Repository<Tag>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProductsService,
        {
          provide: getRepositoryToken(Product),
          useValue: mockProductRepository,
        },
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

    service = module.get<ProductsService>(ProductsService);
    _productRepository = module.get<Repository<Product>>(getRepositoryToken(Product));
    _tagRepository = module.get<Repository<Tag>>(getRepositoryToken(Tag));
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
    it('should create and save a new product without tags', async () => {
      const createProductDto = { name: 'Coucher de soleil sur Tokyo', description: 'Une belle œuvre' };
      const expectedSlug = 'coucher-de-soleil-sur-tokyo';
      const newProduct = createMockProduct({
        id: 'product-uuid',
        name: 'Coucher de soleil sur Tokyo',
        slug: expectedSlug,
        description: 'Une belle œuvre',
        createdBy: mockUser.id,
      });

      mockProductRepository.findOne.mockResolvedValue(null); // name + slug checks
      mockProductRepository.create.mockReturnValue(newProduct);
      mockProductRepository.save.mockResolvedValue(newProduct);

      const result = await service.create(createProductDto, mockUser);

      expect(mockProductRepository.findOne).toHaveBeenCalledWith({ where: { name: 'Coucher de soleil sur Tokyo' } });
      expect(mockProductRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'Coucher de soleil sur Tokyo',
          slug: expectedSlug,
          status: ProductStatus.DRAFT,
          featured: false,
        }),
      );
      expect(mockProductRepository.save).toHaveBeenCalledWith(newProduct);
      expect(mockActivityLogService.log).toHaveBeenCalled();
      expect(result).toEqual(newProduct);
    });

    it('should create product with tags', async () => {
      const tag1 = createMockTag({ id: 'tag-1', name: 'Japon', slug: 'japon' });
      const tag2 = createMockTag({ id: 'tag-2', name: 'Nature', slug: 'nature' });
      const createProductDto = {
        name: 'Forêt de bambous',
        description: 'Paysage japonais',
        tagIds: ['tag-1', 'tag-2'],
      };
      const newProduct = createMockProduct({
        id: 'product-uuid',
        name: 'Forêt de bambous',
        slug: 'foret-de-bambous',
        tags: [tag1, tag2],
      });

      mockProductRepository.findOne.mockResolvedValue(null);
      mockTagRepository.find.mockResolvedValue([tag1, tag2]);
      mockProductRepository.create.mockReturnValue(newProduct);
      mockProductRepository.save.mockResolvedValue(newProduct);

      const result = await service.create(createProductDto, mockUser);

      expect(mockTagRepository.find).toHaveBeenCalledWith({ where: { id: In(['tag-1', 'tag-2']) } });
      expect(result.tags).toHaveLength(2);
    });

    it('should throw ConflictException if product name already exists', async () => {
      const createProductDto = { name: 'Existing Product', description: 'Desc' };
      const existingProduct = createMockProduct({ id: 'existing-uuid', name: 'Existing Product' });

      mockProductRepository.findOne.mockResolvedValue(existingProduct);

      await expect(service.create(createProductDto, mockUser)).rejects.toThrow(ConflictException);
      expect(mockProductRepository.save).not.toHaveBeenCalled();
    });

    it('should throw ConflictException if generated slug already exists', async () => {
      const createProductDto = { name: 'New Product', description: 'Desc' };

      mockProductRepository.findOne
        .mockResolvedValueOnce(null) // name check
        .mockResolvedValueOnce(createMockProduct({ id: 'other-uuid', slug: 'new-product' })); // slug check

      await expect(service.create(createProductDto, mockUser)).rejects.toThrow(ConflictException);
      expect(mockProductRepository.save).not.toHaveBeenCalled();
    });

    it('should throw NotFoundException if some tags are not found', async () => {
      const createProductDto = {
        name: 'Test Product',
        description: 'Desc',
        tagIds: ['tag-1', 'tag-2', 'tag-3'],
      };

      mockProductRepository.findOne.mockResolvedValue(null);
      // Only 2 tags found instead of 3
      mockTagRepository.find.mockResolvedValue([createMockTag({ id: 'tag-1' }), createMockTag({ id: 'tag-2' })]);

      await expect(service.create(createProductDto, mockUser)).rejects.toThrow(NotFoundException);
      expect(mockProductRepository.save).not.toHaveBeenCalled();
    });

    it('should generate correct slug from name with accents', async () => {
      const createProductDto = { name: 'Été à Paris', description: 'Desc' };
      const expectedSlug = 'ete-a-paris';
      const newProduct = createMockProduct({
        id: 'product-uuid',
        name: 'Été à Paris',
        slug: expectedSlug,
      });

      mockProductRepository.findOne.mockResolvedValue(null);
      mockProductRepository.create.mockReturnValue(newProduct);
      mockProductRepository.save.mockResolvedValue(newProduct);

      await service.create(createProductDto, mockUser);

      expect(mockProductRepository.create).toHaveBeenCalledWith(expect.objectContaining({ slug: expectedSlug }));
    });

    it('should create product with custom status and featured', async () => {
      const createProductDto = {
        name: 'Featured Product',
        description: 'Desc',
        status: ProductStatus.PUBLISHED,
        featured: true,
      };
      const newProduct = createMockProduct({
        id: 'product-uuid',
        name: 'Featured Product',
        status: ProductStatus.PUBLISHED,
        featured: true,
      });

      mockProductRepository.findOne.mockResolvedValue(null);
      mockProductRepository.create.mockReturnValue(newProduct);
      mockProductRepository.save.mockResolvedValue(newProduct);

      const result = await service.create(createProductDto, mockUser);

      expect(result.status).toBe(ProductStatus.PUBLISHED);
      expect(result.featured).toBe(true);
    });
  });

  // ========================================
  // FIND ALL
  // ========================================
  describe('findAll', () => {
    it('should return all products ordered by createdAt DESC', async () => {
      const products = [
        createMockProduct({ id: '1', name: 'Product 1', createdAt: new Date('2026-01-02') }),
        createMockProduct({ id: '2', name: 'Product 2', createdAt: new Date('2026-01-01') }),
      ];

      mockProductRepository.find.mockResolvedValue(products);

      const result = await service.findAll();

      expect(result).toEqual(products);
      expect(mockProductRepository.find).toHaveBeenCalledWith({
        where: {},
        relations: ['tags'],
        order: { createdAt: 'DESC' },
      });
    });

    it('should filter products by status when provided', async () => {
      const publishedProducts = [createMockProduct({ id: '1', name: 'Published 1', status: ProductStatus.PUBLISHED })];

      mockProductRepository.find.mockResolvedValue(publishedProducts);

      const result = await service.findAll(ProductStatus.PUBLISHED);

      expect(result).toEqual(publishedProducts);
      expect(mockProductRepository.find).toHaveBeenCalledWith({
        where: { status: ProductStatus.PUBLISHED },
        relations: ['tags'],
        order: { createdAt: 'DESC' },
      });
    });

    it('should return empty array when no products exist', async () => {
      mockProductRepository.find.mockResolvedValue([]);

      const result = await service.findAll();

      expect(result).toEqual([]);
    });
  });

  // ========================================
  // FIND ALL PUBLISHED
  // ========================================
  describe('findAllPublished', () => {
    it('should return only published products', async () => {
      const publishedProducts = [
        createMockProduct({ id: '1', name: 'Published 1', status: ProductStatus.PUBLISHED }),
        createMockProduct({ id: '2', name: 'Published 2', status: ProductStatus.PUBLISHED }),
      ];

      mockProductRepository.find.mockResolvedValue(publishedProducts);

      const result = await service.findAllPublished();

      expect(result).toEqual(publishedProducts);
      expect(mockProductRepository.find).toHaveBeenCalledWith({
        where: { status: ProductStatus.PUBLISHED },
        relations: ['tags'],
        order: { createdAt: 'DESC' },
      });
    });
  });

  // ========================================
  // FIND FEATURED
  // ========================================
  describe('findFeatured', () => {
    it('should return only published and featured products', async () => {
      const featuredProducts = [
        createMockProduct({ id: '1', name: 'Featured 1', status: ProductStatus.PUBLISHED, featured: true }),
      ];

      mockProductRepository.find.mockResolvedValue(featuredProducts);

      const result = await service.findFeatured();

      expect(result).toEqual(featuredProducts);
      expect(mockProductRepository.find).toHaveBeenCalledWith({
        where: {
          status: ProductStatus.PUBLISHED,
          featured: true,
        },
        relations: ['tags'],
        order: { createdAt: 'DESC' },
      });
    });

    it('should return empty array when no featured products exist', async () => {
      mockProductRepository.find.mockResolvedValue([]);

      const result = await service.findFeatured();

      expect(result).toEqual([]);
    });
  });

  // ========================================
  // FIND BY ID
  // ========================================
  describe('findById', () => {
    it('should return a product with tags', async () => {
      const tag = createMockTag({ id: 'tag-1', name: 'Japon' });
      const product = createMockProduct({ id: '1', name: 'Test Product', tags: [tag] });

      mockProductRepository.findOne.mockResolvedValue(product);

      const result = await service.findById('1');

      expect(result).toEqual(product);
      expect(result.tags).toHaveLength(1);
      expect(mockProductRepository.findOne).toHaveBeenCalledWith({
        where: { id: '1' },
        relations: ['tags'],
      });
    });

    it('should throw NotFoundException if product not found', async () => {
      mockProductRepository.findOne.mockResolvedValue(null);

      await expect(service.findById('non-existing-id')).rejects.toThrow(NotFoundException);
    });
  });

  // ========================================
  // FIND BY SLUG
  // ========================================
  describe('findBySlug', () => {
    it('should return a product by slug', async () => {
      const product = createMockProduct({ id: '1', name: 'Tokyo Sunset', slug: 'tokyo-sunset' });

      mockProductRepository.findOne.mockResolvedValue(product);

      const result = await service.findBySlug('tokyo-sunset');

      expect(result).toEqual(product);
      expect(mockProductRepository.findOne).toHaveBeenCalledWith({
        where: { slug: 'tokyo-sunset' },
        relations: ['tags'],
      });
    });

    it('should throw NotFoundException if slug not found', async () => {
      mockProductRepository.findOne.mockResolvedValue(null);

      await expect(service.findBySlug('non-existing-slug')).rejects.toThrow(NotFoundException);
    });
  });

  // ========================================
  // UPDATE
  // ========================================
  describe('update', () => {
    it('should update product name and regenerate slug', async () => {
      const productId = 'product-uuid';
      const existingProduct = createMockProduct({
        id: productId,
        name: 'Old Name',
        slug: 'old-name',
        tags: [],
      });
      const updateProductDto = { name: 'New Name' };
      const updatedProduct = createMockProduct({
        id: productId,
        name: 'New Name',
        slug: 'new-name',
        tags: [],
        modifiedBy: mockUser.id,
      });

      mockProductRepository.findOne
        .mockResolvedValueOnce(existingProduct) // findById
        .mockResolvedValueOnce(null) // check name uniqueness
        .mockResolvedValueOnce(null); // check slug uniqueness

      mockProductRepository.save.mockResolvedValue(updatedProduct);

      const result = await service.update(productId, updateProductDto, mockUser);

      expect(result.name).toBe('New Name');
      expect(result.slug).toBe('new-name');
      expect(mockProductRepository.save).toHaveBeenCalled();
      expect(mockActivityLogService.log).toHaveBeenCalledWith(
        expect.objectContaining({
          metadata: expect.objectContaining({
            oldValues: expect.objectContaining({ name: 'Old Name', slug: 'old-name' }),
            newValues: expect.objectContaining({ name: 'New Name', slug: 'new-name' }),
          }),
        }),
      );
    });

    it('should update product status', async () => {
      const productId = 'product-uuid';
      const existingProduct = createMockProduct({
        id: productId,
        name: 'Product',
        status: ProductStatus.DRAFT,
        tags: [],
      });
      const updateProductDto = { status: ProductStatus.PUBLISHED };
      const updatedProduct = createMockProduct({
        id: productId,
        name: 'Product',
        status: ProductStatus.PUBLISHED,
        tags: [],
        modifiedBy: mockUser.id,
      });

      mockProductRepository.findOne.mockResolvedValue(existingProduct);
      mockProductRepository.save.mockResolvedValue(updatedProduct);

      const result = await service.update(productId, updateProductDto, mockUser);

      expect(result.status).toBe(ProductStatus.PUBLISHED);
    });

    it('should replace tags entirely when tagIds provided', async () => {
      const productId = 'product-uuid';
      const oldTag = createMockTag({ id: 'old-tag', name: 'Old Tag' });
      const newTag = createMockTag({ id: 'new-tag', name: 'New Tag' });
      const existingProduct = createMockProduct({
        id: productId,
        name: 'Product',
        tags: [oldTag],
      });
      const updateProductDto = { tagIds: ['new-tag'] };
      const updatedProduct = createMockProduct({
        id: productId,
        name: 'Product',
        tags: [newTag],
        modifiedBy: mockUser.id,
      });

      mockProductRepository.findOne.mockResolvedValue(existingProduct);
      mockTagRepository.find.mockResolvedValue([newTag]);
      mockProductRepository.save.mockResolvedValue(updatedProduct);

      const result = await service.update(productId, updateProductDto, mockUser);

      expect(result.tags).toHaveLength(1);
      expect(result.tags[0].id).toBe('new-tag');
      expect(mockTagRepository.find).toHaveBeenCalledWith({ where: { id: In(['new-tag']) } });
    });

    it('should remove all tags when empty tagIds array provided', async () => {
      const productId = 'product-uuid';
      const existingTag = createMockTag({ id: 'tag-1', name: 'Tag' });
      const existingProduct = createMockProduct({
        id: productId,
        name: 'Product',
        tags: [existingTag],
      });
      const updateProductDto = { tagIds: [] };
      const updatedProduct = createMockProduct({
        id: productId,
        name: 'Product',
        tags: [],
        modifiedBy: mockUser.id,
      });

      mockProductRepository.findOne.mockResolvedValue(existingProduct);
      mockProductRepository.save.mockResolvedValue(updatedProduct);

      const result = await service.update(productId, updateProductDto, mockUser);

      expect(result.tags).toHaveLength(0);
      // Should not call tagRepository.find for empty array
      expect(mockTagRepository.find).not.toHaveBeenCalled();
    });

    it('should throw NotFoundException if product to update not found', async () => {
      mockProductRepository.findOne.mockResolvedValue(null);

      await expect(service.update('non-existing-id', { name: 'New' }, mockUser)).rejects.toThrow(NotFoundException);
      expect(mockProductRepository.save).not.toHaveBeenCalled();
    });

    it('should throw ConflictException if new name already exists', async () => {
      const productId = 'product-uuid';
      const existingProduct = createMockProduct({ id: productId, name: 'Old Name', tags: [] });
      const anotherProduct = createMockProduct({ id: 'other-uuid', name: 'New Name' });

      mockProductRepository.findOne
        .mockResolvedValueOnce(existingProduct) // findById
        .mockResolvedValueOnce(anotherProduct); // check name uniqueness

      await expect(service.update(productId, { name: 'New Name' }, mockUser)).rejects.toThrow(ConflictException);
      expect(mockProductRepository.save).not.toHaveBeenCalled();
    });

    it('should throw NotFoundException if some tags not found during update', async () => {
      const productId = 'product-uuid';
      const existingProduct = createMockProduct({ id: productId, name: 'Product', tags: [] });

      mockProductRepository.findOne.mockResolvedValue(existingProduct);
      // Only 1 tag found instead of 2
      mockTagRepository.find.mockResolvedValue([createMockTag({ id: 'tag-1' })]);

      await expect(service.update(productId, { tagIds: ['tag-1', 'tag-2'] }, mockUser)).rejects.toThrow(
        NotFoundException,
      );
      expect(mockProductRepository.save).not.toHaveBeenCalled();
    });

    it('should not check name uniqueness if name is not changed', async () => {
      const productId = 'product-uuid';
      const existingProduct = createMockProduct({
        id: productId,
        name: 'Same Name',
        description: 'Old desc',
        tags: [],
      });
      const updatedProduct = createMockProduct({
        ...existingProduct,
        description: 'New desc',
        modifiedBy: mockUser.id,
      });

      mockProductRepository.findOne.mockResolvedValue(existingProduct);
      mockProductRepository.save.mockResolvedValue(updatedProduct);

      await service.update(productId, { description: 'New desc' }, mockUser);

      // Should only be called once (for findById)
      expect(mockProductRepository.findOne).toHaveBeenCalledTimes(1);
    });
  });

  // ========================================
  // REMOVE
  // ========================================
  describe('remove', () => {
    it('should remove a product and log the action', async () => {
      const productId = 'product-to-delete-uuid';
      const tag = createMockTag({ id: 'tag-1', name: 'Japon' });
      const product = createMockProduct({
        id: productId,
        name: 'To Delete',
        slug: 'to-delete',
        status: ProductStatus.DRAFT,
        tags: [tag],
      });

      mockProductRepository.findOne.mockResolvedValue(product);
      mockProductRepository.remove.mockResolvedValue(undefined);

      await expect(service.remove(productId, mockUser)).resolves.toBeUndefined();

      expect(mockProductRepository.findOne).toHaveBeenCalledWith({
        where: { id: productId },
        relations: ['tags'],
      });
      expect(mockActivityLogService.log).toHaveBeenCalledWith(
        expect.objectContaining({
          metadata: expect.objectContaining({
            deletedProductName: 'To Delete',
            deletedProductSlug: 'to-delete',
            status: ProductStatus.DRAFT,
            tagIds: ['tag-1'],
          }),
        }),
      );
      expect(mockProductRepository.remove).toHaveBeenCalledWith(product);
    });

    it('should throw NotFoundException if product to remove is not found', async () => {
      const productId = 'non-existing-id';

      mockProductRepository.findOne.mockResolvedValue(null);

      await expect(service.remove(productId, mockUser)).rejects.toThrow(NotFoundException);
      expect(mockActivityLogService.log).not.toHaveBeenCalled();
      expect(mockProductRepository.remove).not.toHaveBeenCalled();
    });
  });
});
