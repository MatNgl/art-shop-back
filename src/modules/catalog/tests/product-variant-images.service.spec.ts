import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { ProductVariantImagesService } from '../services/product-variant-images.service';
import { ProductVariantImage, ProductVariantImageStatus } from '../entities/product-variant-image.entity';
import { ProductVariant, ProductVariantStatus } from '../entities/product-variant.entity';
import { Product, ProductStatus } from '../entities/product.entity';
import { StorageService } from '../../storage';
import { ActivityLogService } from '../../activity-logs';
import { User } from '../../users/entities/user.entity';
import { Role } from '../../roles/entities/role.entity';

// Mocks
const mockActivityLogService = {
  log: jest.fn(),
};

const mockStorageService = {
  uploadVariantImage: jest.fn(),
  deleteImage: jest.fn(),
  getAllImageUrls: jest.fn(),
};

const mockVariantImageRepository = {
  create: jest.fn(),
  save: jest.fn(),
  find: jest.fn(),
  findOne: jest.fn(),
  remove: jest.fn(),
  createQueryBuilder: jest.fn(),
};

const mockVariantRepository = {
  findOne: jest.fn(),
};

const mockProductRepository = {
  findOne: jest.fn(),
};

// Mock User
const mockUser = new User();
mockUser.id = 'user-uuid';
mockUser.role = new Role();
mockUser.role.code = 'ADMIN';

// Mock Product
const createMockProduct = (overrides: Partial<Product> = {}): Product => {
  return {
    id: 'product-uuid',
    name: 'Test Product',
    slug: 'test-product',
    description: 'Description',
    shortDescription: null,
    status: ProductStatus.PUBLISHED,
    featured: false,
    seoTitle: null,
    seoDescription: null,
    tags: [],
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

// Mock ProductVariant
const createMockVariant = (overrides: Partial<ProductVariant> = {}): ProductVariant => {
  return {
    id: 'variant-uuid',
    productId: 'product-uuid',
    formatId: 'format-uuid',
    materialId: 'material-uuid',
    price: 49.99,
    stockQty: 10,
    status: ProductVariantStatus.AVAILABLE,
    format: { id: 'format-uuid', name: 'A4' },
    material: { id: 'material-uuid', name: 'Toile' },
    images: [],
    createdBy: 'user-uuid',
    createdAt: new Date('2026-01-01'),
    updatedAt: new Date('2026-01-01'),
    ...overrides,
  } as ProductVariant;
};

// Mock ProductVariantImage
const createMockVariantImage = (overrides: Partial<ProductVariantImage> = {}): ProductVariantImage => {
  return {
    id: 'image-uuid',
    variantId: 'variant-uuid',
    publicId: 'art-shop/products/test-product/variants/variant-uuid/image123',
    url: 'https://res.cloudinary.com/demo/image/upload/image123.jpg',
    altText: 'Test variant image',
    position: 0,
    isPrimary: false,
    status: ProductVariantImageStatus.ACTIVE,
    createdById: 'user-uuid',
    createdByUser: mockUser,
    variant: createMockVariant(),
    createdAt: new Date('2026-01-01'),
    ...overrides,
  } as ProductVariantImage;
};

// Mock File
const createMockFile = (overrides: Partial<{ mimetype: string; size: number; buffer: Buffer }> = {}) => {
  return {
    fieldname: 'file',
    originalname: 'test.jpg',
    encoding: '7bit',
    mimetype: 'image/jpeg',
    size: 1024 * 100,
    buffer: Buffer.from('fake-image-data'),
    ...overrides,
  };
};

// Mock URLs
const mockImageUrls = {
  thumbnail: 'https://res.cloudinary.com/demo/thumb.jpg',
  small: 'https://res.cloudinary.com/demo/small.jpg',
  medium: 'https://res.cloudinary.com/demo/medium.jpg',
  large: 'https://res.cloudinary.com/demo/large.jpg',
  original: 'https://res.cloudinary.com/demo/original.jpg',
};

describe('ProductVariantImagesService', () => {
  let service: ProductVariantImagesService;
  let _variantImageRepository: Repository<ProductVariantImage>;
  let _variantRepository: Repository<ProductVariant>;
  let _productRepository: Repository<Product>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProductVariantImagesService,
        {
          provide: getRepositoryToken(ProductVariantImage),
          useValue: mockVariantImageRepository,
        },
        {
          provide: getRepositoryToken(ProductVariant),
          useValue: mockVariantRepository,
        },
        {
          provide: getRepositoryToken(Product),
          useValue: mockProductRepository,
        },
        {
          provide: StorageService,
          useValue: mockStorageService,
        },
        {
          provide: ActivityLogService,
          useValue: mockActivityLogService,
        },
      ],
    }).compile();

    service = module.get<ProductVariantImagesService>(ProductVariantImagesService);
    _variantImageRepository = module.get<Repository<ProductVariantImage>>(getRepositoryToken(ProductVariantImage));
    _variantRepository = module.get<Repository<ProductVariant>>(getRepositoryToken(ProductVariant));
    _productRepository = module.get<Repository<Product>>(getRepositoryToken(Product));

    mockStorageService.getAllImageUrls.mockReturnValue(mockImageUrls);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  // UPLOAD
  describe('upload', () => {
    const mockFile = createMockFile();
    const mockUploadResult = {
      publicId: 'art-shop/products/test-product/variants/variant-uuid/newimage',
      secureUrl: 'https://res.cloudinary.com/demo/newimage.jpg',
    };

    it('should upload an image successfully', async () => {
      const product = createMockProduct();
      const variant = createMockVariant();
      const savedImage = createMockVariantImage({ publicId: mockUploadResult.publicId });

      mockProductRepository.findOne.mockResolvedValue(product);
      mockVariantRepository.findOne.mockResolvedValue(variant);
      mockStorageService.uploadVariantImage.mockResolvedValue(mockUploadResult);
      mockVariantImageRepository.create.mockReturnValue(savedImage);
      mockVariantImageRepository.save.mockResolvedValue(savedImage);

      const result = await service.upload('product-uuid', 'variant-uuid', mockFile, { altText: 'Test' }, mockUser);

      expect(result.publicId).toBe(mockUploadResult.publicId);
      expect(mockStorageService.uploadVariantImage).toHaveBeenCalledWith(mockFile.buffer, product.slug, 'variant-uuid');
      expect(mockActivityLogService.log).toHaveBeenCalled();
    });

    it('should throw NotFoundException if product not found', async () => {
      mockProductRepository.findOne.mockResolvedValue(null);

      await expect(service.upload('invalid-uuid', 'variant-uuid', mockFile, {}, mockUser)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw NotFoundException if variant not found', async () => {
      const product = createMockProduct();

      mockProductRepository.findOne.mockResolvedValue(product);
      mockVariantRepository.findOne.mockResolvedValue(null);

      await expect(service.upload('product-uuid', 'invalid-uuid', mockFile, {}, mockUser)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw BadRequestException if no file provided', async () => {
      const product = createMockProduct();
      const variant = createMockVariant();

      mockProductRepository.findOne.mockResolvedValue(product);
      mockVariantRepository.findOne.mockResolvedValue(variant);

      await expect(service.upload('product-uuid', 'variant-uuid', null as never, {}, mockUser)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should throw BadRequestException if invalid mime type', async () => {
      const product = createMockProduct();
      const variant = createMockVariant();
      const invalidFile = createMockFile({ mimetype: 'application/pdf' });

      mockProductRepository.findOne.mockResolvedValue(product);
      mockVariantRepository.findOne.mockResolvedValue(variant);

      await expect(service.upload('product-uuid', 'variant-uuid', invalidFile, {}, mockUser)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should throw BadRequestException if file too large', async () => {
      const product = createMockProduct();
      const variant = createMockVariant();
      const largeFile = createMockFile({ size: 15 * 1024 * 1024 });

      mockProductRepository.findOne.mockResolvedValue(product);
      mockVariantRepository.findOne.mockResolvedValue(variant);

      await expect(service.upload('product-uuid', 'variant-uuid', largeFile, {}, mockUser)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should clear primary flag when isPrimary is true', async () => {
      const product = createMockProduct();
      const variant = createMockVariant();
      const savedImage = createMockVariantImage({ isPrimary: true });
      const mockQueryBuilder = {
        update: jest.fn().mockReturnThis(),
        set: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        execute: jest.fn().mockResolvedValue({}),
      };

      mockProductRepository.findOne.mockResolvedValue(product);
      mockVariantRepository.findOne.mockResolvedValue(variant);
      mockStorageService.uploadVariantImage.mockResolvedValue({
        publicId: 'new-public-id',
        secureUrl: 'https://example.com/image.jpg',
      });
      mockVariantImageRepository.create.mockReturnValue(savedImage);
      mockVariantImageRepository.save.mockResolvedValue(savedImage);
      mockVariantImageRepository.createQueryBuilder.mockReturnValue(mockQueryBuilder);

      await service.upload('product-uuid', 'variant-uuid', mockFile, { isPrimary: true }, mockUser);

      expect(mockQueryBuilder.execute).toHaveBeenCalled();
    });
  });

  // FIND ALL BY VARIANT ID
  describe('findAllByVariantId', () => {
    it('should return all images for a variant', async () => {
      const product = createMockProduct();
      const variant = createMockVariant();
      const images = [
        createMockVariantImage({ id: 'img-1', position: 0 }),
        createMockVariantImage({ id: 'img-2', position: 1 }),
      ];

      mockProductRepository.findOne.mockResolvedValue(product);
      mockVariantRepository.findOne.mockResolvedValue(variant);
      mockVariantImageRepository.find.mockResolvedValue(images);

      const result = await service.findAllByVariantId('product-uuid', 'variant-uuid');

      expect(result).toHaveLength(2);
      expect(mockVariantImageRepository.find).toHaveBeenCalledWith({
        where: { variantId: 'variant-uuid' },
        order: { position: 'ASC', createdAt: 'ASC' },
      });
    });

    it('should throw NotFoundException if product not found', async () => {
      mockProductRepository.findOne.mockResolvedValue(null);

      await expect(service.findAllByVariantId('invalid-uuid', 'variant-uuid')).rejects.toThrow(NotFoundException);
    });

    it('should throw NotFoundException if variant not found', async () => {
      const product = createMockProduct();

      mockProductRepository.findOne.mockResolvedValue(product);
      mockVariantRepository.findOne.mockResolvedValue(null);

      await expect(service.findAllByVariantId('product-uuid', 'invalid-uuid')).rejects.toThrow(NotFoundException);
    });

    it('should return empty array if no images', async () => {
      const product = createMockProduct();
      const variant = createMockVariant();

      mockProductRepository.findOne.mockResolvedValue(product);
      mockVariantRepository.findOne.mockResolvedValue(variant);
      mockVariantImageRepository.find.mockResolvedValue([]);

      const result = await service.findAllByVariantId('product-uuid', 'variant-uuid');

      expect(result).toEqual([]);
    });
  });

  // FIND ONE
  describe('findOne', () => {
    it('should return a single image', async () => {
      const product = createMockProduct();
      const variant = createMockVariant();
      const image = createMockVariantImage();

      mockProductRepository.findOne.mockResolvedValue(product);
      mockVariantRepository.findOne.mockResolvedValue(variant);
      mockVariantImageRepository.findOne.mockResolvedValue(image);

      const result = await service.findOne('product-uuid', 'variant-uuid', 'image-uuid');

      expect(result.id).toBe(image.id);
    });

    it('should throw NotFoundException if image not found', async () => {
      const product = createMockProduct();
      const variant = createMockVariant();

      mockProductRepository.findOne.mockResolvedValue(product);
      mockVariantRepository.findOne.mockResolvedValue(variant);
      mockVariantImageRepository.findOne.mockResolvedValue(null);

      await expect(service.findOne('product-uuid', 'variant-uuid', 'invalid-uuid')).rejects.toThrow(NotFoundException);
    });
  });

  // UPDATE
  describe('update', () => {
    it('should update image metadata', async () => {
      const product = createMockProduct();
      const variant = createMockVariant();
      const image = createMockVariantImage({ altText: 'Old text', position: 0 });
      const updatedImage = createMockVariantImage({ altText: 'New text', position: 1 });

      mockProductRepository.findOne.mockResolvedValue(product);
      mockVariantRepository.findOne.mockResolvedValue(variant);
      mockVariantImageRepository.findOne.mockResolvedValue(image);
      mockVariantImageRepository.save.mockResolvedValue(updatedImage);

      const result = await service.update(
        'product-uuid',
        'variant-uuid',
        'image-uuid',
        { altText: 'New text', position: 1 },
        mockUser,
      );

      expect(result.altText).toBe('New text');
      expect(mockActivityLogService.log).toHaveBeenCalledWith(
        expect.objectContaining({
          metadata: expect.objectContaining({
            oldValues: expect.objectContaining({ altText: 'Old text' }),
            newValues: expect.objectContaining({ altText: 'New text' }),
          }),
        }),
      );
    });

    it('should throw NotFoundException if image not found', async () => {
      const product = createMockProduct();
      const variant = createMockVariant();

      mockProductRepository.findOne.mockResolvedValue(product);
      mockVariantRepository.findOne.mockResolvedValue(variant);
      mockVariantImageRepository.findOne.mockResolvedValue(null);

      await expect(service.update('product-uuid', 'variant-uuid', 'invalid-uuid', {}, mockUser)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  // DELETE
  describe('delete', () => {
    it('should delete image from Cloudinary and database', async () => {
      const product = createMockProduct();
      const variant = createMockVariant();
      const image = createMockVariantImage();

      mockProductRepository.findOne.mockResolvedValue(product);
      mockVariantRepository.findOne.mockResolvedValue(variant);
      mockVariantImageRepository.findOne.mockResolvedValue(image);
      mockStorageService.deleteImage.mockResolvedValue({ result: 'ok' });
      mockVariantImageRepository.remove.mockResolvedValue(undefined);

      await service.delete('product-uuid', 'variant-uuid', 'image-uuid', mockUser);

      expect(mockStorageService.deleteImage).toHaveBeenCalledWith(image.publicId);
      expect(mockVariantImageRepository.remove).toHaveBeenCalledWith(image);
      expect(mockActivityLogService.log).toHaveBeenCalled();
    });

    it('should throw NotFoundException if image not found', async () => {
      const product = createMockProduct();
      const variant = createMockVariant();

      mockProductRepository.findOne.mockResolvedValue(product);
      mockVariantRepository.findOne.mockResolvedValue(variant);
      mockVariantImageRepository.findOne.mockResolvedValue(null);

      await expect(service.delete('product-uuid', 'variant-uuid', 'invalid-uuid', mockUser)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should still delete from database if Cloudinary fails', async () => {
      const product = createMockProduct();
      const variant = createMockVariant();
      const image = createMockVariantImage();

      mockProductRepository.findOne.mockResolvedValue(product);
      mockVariantRepository.findOne.mockResolvedValue(variant);
      mockVariantImageRepository.findOne.mockResolvedValue(image);
      mockStorageService.deleteImage.mockRejectedValue(new Error('Cloudinary error'));
      mockVariantImageRepository.remove.mockResolvedValue(undefined);

      await service.delete('product-uuid', 'variant-uuid', 'image-uuid', mockUser);

      expect(mockVariantImageRepository.remove).toHaveBeenCalledWith(image);
    });
  });

  // SET PRIMARY
  describe('setPrimary', () => {
    it('should set image as primary', async () => {
      const product = createMockProduct();
      const variant = createMockVariant();
      const image = createMockVariantImage({ isPrimary: false });
      const mockQueryBuilder = {
        update: jest.fn().mockReturnThis(),
        set: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        execute: jest.fn().mockResolvedValue({}),
      };

      mockProductRepository.findOne.mockResolvedValue(product);
      mockVariantRepository.findOne.mockResolvedValue(variant);
      mockVariantImageRepository.findOne.mockResolvedValue(image);
      mockVariantImageRepository.save.mockResolvedValue({ ...image, isPrimary: true });
      mockVariantImageRepository.createQueryBuilder.mockReturnValue(mockQueryBuilder);

      const result = await service.setPrimary('product-uuid', 'variant-uuid', 'image-uuid', mockUser);

      expect(result.isPrimary).toBe(true);
      expect(mockQueryBuilder.execute).toHaveBeenCalled();
      expect(mockActivityLogService.log).toHaveBeenCalled();
    });

    it('should return immediately if already primary', async () => {
      const product = createMockProduct();
      const variant = createMockVariant();
      const image = createMockVariantImage({ isPrimary: true });

      mockProductRepository.findOne.mockResolvedValue(product);
      mockVariantRepository.findOne.mockResolvedValue(variant);
      mockVariantImageRepository.findOne.mockResolvedValue(image);

      const result = await service.setPrimary('product-uuid', 'variant-uuid', 'image-uuid', mockUser);

      expect(result.isPrimary).toBe(true);
      expect(mockVariantImageRepository.save).not.toHaveBeenCalled();
    });

    it('should throw NotFoundException if image not found', async () => {
      const product = createMockProduct();
      const variant = createMockVariant();

      mockProductRepository.findOne.mockResolvedValue(product);
      mockVariantRepository.findOne.mockResolvedValue(variant);
      mockVariantImageRepository.findOne.mockResolvedValue(null);

      await expect(service.setPrimary('product-uuid', 'variant-uuid', 'invalid-uuid', mockUser)).rejects.toThrow(
        NotFoundException,
      );
    });
  });
});
