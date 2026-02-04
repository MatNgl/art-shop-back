import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { ProductImagesService } from '../services/product-images.service';
import { ProductImage, ProductImageStatus } from '../entities/product-image.entity';
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
  uploadProductImage: jest.fn(),
  deleteImage: jest.fn(),
  getAllImageUrls: jest.fn(),
};

const mockProductImageRepository = {
  create: jest.fn(),
  save: jest.fn(),
  find: jest.fn(),
  findOne: jest.fn(),
  remove: jest.fn(),
  existsBy: jest.fn(),
  createQueryBuilder: jest.fn(),
};

const mockProductRepository = {
  findOne: jest.fn(),
  existsBy: jest.fn(),
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

// Mock ProductImage
const createMockProductImage = (overrides: Partial<ProductImage> = {}): ProductImage => {
  return {
    id: 'image-uuid',
    productId: 'product-uuid',
    publicId: 'art-shop/products/test-product/image123',
    url: 'https://res.cloudinary.com/demo/image/upload/image123.jpg',
    altText: 'Test image',
    position: 0,
    isPrimary: false,
    status: ProductImageStatus.ACTIVE,
    createdById: 'user-uuid',
    createdByUser: mockUser,
    product: createMockProduct(),
    createdAt: new Date('2026-01-01'),
    ...overrides,
  } as ProductImage;
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

describe('ProductImagesService', () => {
  let service: ProductImagesService;
  let _productImageRepository: Repository<ProductImage>;
  let _productRepository: Repository<Product>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProductImagesService,
        {
          provide: getRepositoryToken(ProductImage),
          useValue: mockProductImageRepository,
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

    service = module.get<ProductImagesService>(ProductImagesService);
    _productImageRepository = module.get<Repository<ProductImage>>(getRepositoryToken(ProductImage));
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
      publicId: 'art-shop/products/test-product/newimage',
      secureUrl: 'https://res.cloudinary.com/demo/newimage.jpg',
    };

    it('should upload an image successfully', async () => {
      const product = createMockProduct();
      const savedImage = createMockProductImage({ publicId: mockUploadResult.publicId });

      mockProductRepository.findOne.mockResolvedValue(product);
      mockStorageService.uploadProductImage.mockResolvedValue(mockUploadResult);
      mockProductImageRepository.create.mockReturnValue(savedImage);
      mockProductImageRepository.save.mockResolvedValue(savedImage);

      const result = await service.upload('product-uuid', mockFile, { altText: 'Test' }, mockUser);

      expect(result.publicId).toBe(mockUploadResult.publicId);
      expect(mockStorageService.uploadProductImage).toHaveBeenCalledWith(mockFile.buffer, product.slug);
      expect(mockActivityLogService.log).toHaveBeenCalled();
    });

    it('should throw NotFoundException if product not found', async () => {
      mockProductRepository.findOne.mockResolvedValue(null);

      await expect(service.upload('invalid-uuid', mockFile, {}, mockUser)).rejects.toThrow(NotFoundException);
      expect(mockStorageService.uploadProductImage).not.toHaveBeenCalled();
    });

    it('should throw BadRequestException if no file provided', async () => {
      const product = createMockProduct();
      mockProductRepository.findOne.mockResolvedValue(product);

      await expect(service.upload('product-uuid', null as never, {}, mockUser)).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException if invalid mime type', async () => {
      const product = createMockProduct();
      const invalidFile = createMockFile({ mimetype: 'application/pdf' });

      mockProductRepository.findOne.mockResolvedValue(product);

      await expect(service.upload('product-uuid', invalidFile, {}, mockUser)).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException if file too large', async () => {
      const product = createMockProduct();
      const largeFile = createMockFile({ size: 15 * 1024 * 1024 });

      mockProductRepository.findOne.mockResolvedValue(product);

      await expect(service.upload('product-uuid', largeFile, {}, mockUser)).rejects.toThrow(BadRequestException);
    });

    it('should clear primary flag when isPrimary is true', async () => {
      const product = createMockProduct();
      const savedImage = createMockProductImage({ isPrimary: true });
      const mockQueryBuilder = {
        update: jest.fn().mockReturnThis(),
        set: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        execute: jest.fn().mockResolvedValue({}),
      };

      mockProductRepository.findOne.mockResolvedValue(product);
      mockStorageService.uploadProductImage.mockResolvedValue({
        publicId: 'new-public-id',
        secureUrl: 'https://example.com/image.jpg',
      });
      mockProductImageRepository.create.mockReturnValue(savedImage);
      mockProductImageRepository.save.mockResolvedValue(savedImage);
      mockProductImageRepository.createQueryBuilder.mockReturnValue(mockQueryBuilder);

      await service.upload('product-uuid', mockFile, { isPrimary: true }, mockUser);

      expect(mockQueryBuilder.execute).toHaveBeenCalled();
    });
  });

  // FIND ALL BY PRODUCT ID
  describe('findAllByProductId', () => {
    it('should return all images for a product', async () => {
      const images = [
        createMockProductImage({ id: 'img-1', position: 0 }),
        createMockProductImage({ id: 'img-2', position: 1 }),
      ];

      mockProductRepository.existsBy.mockResolvedValue(true);
      mockProductImageRepository.find.mockResolvedValue(images);

      const result = await service.findAllByProductId('product-uuid');

      expect(result).toHaveLength(2);
      expect(mockProductImageRepository.find).toHaveBeenCalledWith({
        where: { productId: 'product-uuid' },
        order: { position: 'ASC', createdAt: 'ASC' },
      });
    });

    it('should throw NotFoundException if product not found', async () => {
      mockProductRepository.existsBy.mockResolvedValue(false);

      await expect(service.findAllByProductId('invalid-uuid')).rejects.toThrow(NotFoundException);
    });

    it('should return empty array if no images', async () => {
      mockProductRepository.existsBy.mockResolvedValue(true);
      mockProductImageRepository.find.mockResolvedValue([]);

      const result = await service.findAllByProductId('product-uuid');

      expect(result).toEqual([]);
    });
  });

  // FIND ONE
  describe('findOne', () => {
    it('should return a single image', async () => {
      const image = createMockProductImage();

      mockProductImageRepository.findOne.mockResolvedValue(image);

      const result = await service.findOne('product-uuid', 'image-uuid');

      expect(result.id).toBe(image.id);
      expect(mockProductImageRepository.findOne).toHaveBeenCalledWith({
        where: { id: 'image-uuid', productId: 'product-uuid' },
      });
    });

    it('should throw NotFoundException if image not found', async () => {
      mockProductImageRepository.findOne.mockResolvedValue(null);

      await expect(service.findOne('product-uuid', 'invalid-uuid')).rejects.toThrow(NotFoundException);
    });
  });

  // UPDATE
  describe('update', () => {
    it('should update image metadata', async () => {
      const image = createMockProductImage({ altText: 'Old text', position: 0 });
      const updatedImage = createMockProductImage({ altText: 'New text', position: 1 });

      mockProductImageRepository.findOne.mockResolvedValue(image);
      mockProductImageRepository.save.mockResolvedValue(updatedImage);

      const result = await service.update('product-uuid', 'image-uuid', { altText: 'New text', position: 1 }, mockUser);

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
      mockProductImageRepository.findOne.mockResolvedValue(null);

      await expect(service.update('product-uuid', 'invalid-uuid', {}, mockUser)).rejects.toThrow(NotFoundException);
    });

    it('should clear primary flag when setting new primary', async () => {
      const image = createMockProductImage({ isPrimary: false });
      const mockQueryBuilder = {
        update: jest.fn().mockReturnThis(),
        set: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        execute: jest.fn().mockResolvedValue({}),
      };

      mockProductImageRepository.findOne.mockResolvedValue(image);
      mockProductImageRepository.save.mockResolvedValue({ ...image, isPrimary: true });
      mockProductImageRepository.createQueryBuilder.mockReturnValue(mockQueryBuilder);

      await service.update('product-uuid', 'image-uuid', { isPrimary: true }, mockUser);

      expect(mockQueryBuilder.execute).toHaveBeenCalled();
    });
  });

  // DELETE
  describe('delete', () => {
    it('should delete image from Cloudinary and database', async () => {
      const image = createMockProductImage();

      mockProductImageRepository.findOne.mockResolvedValue(image);
      mockStorageService.deleteImage.mockResolvedValue({ result: 'ok' });
      mockProductImageRepository.remove.mockResolvedValue(undefined);

      await service.delete('product-uuid', 'image-uuid', mockUser);

      expect(mockStorageService.deleteImage).toHaveBeenCalledWith(image.publicId);
      expect(mockProductImageRepository.remove).toHaveBeenCalledWith(image);
      expect(mockActivityLogService.log).toHaveBeenCalled();
    });

    it('should throw NotFoundException if image not found', async () => {
      mockProductImageRepository.findOne.mockResolvedValue(null);

      await expect(service.delete('product-uuid', 'invalid-uuid', mockUser)).rejects.toThrow(NotFoundException);
    });

    it('should still delete from database if Cloudinary fails', async () => {
      const image = createMockProductImage();

      mockProductImageRepository.findOne.mockResolvedValue(image);
      mockStorageService.deleteImage.mockRejectedValue(new Error('Cloudinary error'));
      mockProductImageRepository.remove.mockResolvedValue(undefined);

      await service.delete('product-uuid', 'image-uuid', mockUser);

      expect(mockProductImageRepository.remove).toHaveBeenCalledWith(image);
    });
  });

  // SET PRIMARY
  describe('setPrimary', () => {
    it('should set image as primary', async () => {
      const image = createMockProductImage({ isPrimary: false });
      const mockQueryBuilder = {
        update: jest.fn().mockReturnThis(),
        set: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        execute: jest.fn().mockResolvedValue({}),
      };

      mockProductImageRepository.findOne.mockResolvedValue(image);
      mockProductImageRepository.save.mockResolvedValue({ ...image, isPrimary: true });
      mockProductImageRepository.createQueryBuilder.mockReturnValue(mockQueryBuilder);

      const result = await service.setPrimary('product-uuid', 'image-uuid', mockUser);

      expect(result.isPrimary).toBe(true);
      expect(mockQueryBuilder.execute).toHaveBeenCalled();
      expect(mockActivityLogService.log).toHaveBeenCalled();
    });

    it('should return immediately if already primary', async () => {
      const image = createMockProductImage({ isPrimary: true });

      mockProductImageRepository.findOne.mockResolvedValue(image);

      const result = await service.setPrimary('product-uuid', 'image-uuid', mockUser);

      expect(result.isPrimary).toBe(true);
      expect(mockProductImageRepository.save).not.toHaveBeenCalled();
    });

    it('should throw NotFoundException if image not found', async () => {
      mockProductImageRepository.findOne.mockResolvedValue(null);

      await expect(service.setPrimary('product-uuid', 'invalid-uuid', mockUser)).rejects.toThrow(NotFoundException);
    });
  });
});
