import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { DataSource } from 'typeorm';
import { Role } from '../src/modules/roles/entities/role.entity';
import { User, UserStatus, AuthProvider } from '../src/modules/users/entities/user.entity';
import { Product, ProductStatus } from '../src/modules/catalog/entities/product.entity';
import { ProductVariant, ProductVariantStatus } from '../src/modules/catalog/entities/product-variant.entity';
import {
  ProductVariantImage,
  ProductVariantImageStatus,
} from '../src/modules/catalog/entities/product-variant-image.entity';
import { Format } from '../src/modules/catalog/entities/format.entity';
import { Material } from '../src/modules/catalog/entities/material.entity';
import { StorageService } from '../src/modules/storage';
import * as bcrypt from 'bcrypt';

// Types pour les réponses API
interface AuthResponse {
  accessToken: string;
  user: {
    id: string;
    email: string;
  };
}

interface ProductVariantImageResponseDto {
  id: string;
  variantId: string;
  publicId: string;
  url: string;
  urls: {
    thumbnail: string;
    small: string;
    medium: string;
    large: string;
    original: string;
  };
  altText?: string;
  position: number;
  isPrimary: boolean;
  status: ProductVariantImageStatus;
  createdAt: string;
  createdById: string;
}

// Mock du StorageService pour éviter les appels réels à Cloudinary
const mockStorageService = {
  uploadProductImage: jest.fn().mockResolvedValue({
    publicId: 'art-shop/products/test-product/mock-image-id',
    secureUrl: 'https://res.cloudinary.com/demo/image/upload/art-shop/products/test-product/mock-image-id.jpg',
  }),
  uploadVariantImage: jest.fn().mockResolvedValue({
    publicId: 'art-shop/products/test-product/variants/variant-id/mock-image-id',
    secureUrl:
      'https://res.cloudinary.com/demo/image/upload/art-shop/products/test-product/variants/variant-id/mock-image-id.jpg',
  }),
  deleteImage: jest.fn().mockResolvedValue(undefined),
  getAllImageUrls: jest.fn().mockReturnValue({
    thumbnail: 'https://res.cloudinary.com/demo/image/upload/w_150,h_150/mock.jpg',
    small: 'https://res.cloudinary.com/demo/image/upload/w_300,h_300/mock.jpg',
    medium: 'https://res.cloudinary.com/demo/image/upload/w_600,h_600/mock.jpg',
    large: 'https://res.cloudinary.com/demo/image/upload/w_1200,h_1200/mock.jpg',
    original: 'https://res.cloudinary.com/demo/image/upload/q_auto/mock.jpg',
  }),
};

describe('Product Variant Images (e2e)', () => {
  let app: INestApplication;
  let dataSource: DataSource;
  let adminToken: string;
  let userToken: string;
  let adminUser: User;
  let normalUser: User;
  let testProduct: Product;
  let testVariant: ProductVariant;
  let testFormat: Format;
  let testMaterial: Material;
  let testImage: ProductVariantImage;
  let adminRole: Role;
  let userRole: Role;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(StorageService)
      .useValue(mockStorageService)
      .compile();

    app = moduleFixture.createNestApplication();

    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );

    await app.init();

    dataSource = moduleFixture.get<DataSource>(DataSource);

    // Récupère les rôles
    const roleRepository = dataSource.getRepository(Role);
    adminRole = (await roleRepository.findOne({ where: { code: 'ADMIN' } })) as Role;
    userRole = (await roleRepository.findOne({ where: { code: 'USER' } })) as Role;

    // Crée les utilisateurs de test
    const userRepository = dataSource.getRepository(User);
    const passwordHash = await bcrypt.hash('password123', 10);

    adminUser = userRepository.create({
      email: 'admin-variant-images@test.com',
      passwordHash,
      role: adminRole,
      roleId: adminRole.id,
      status: UserStatus.ACTIVE,
      authProvider: AuthProvider.LOCAL,
    });
    await userRepository.save(adminUser);

    normalUser = userRepository.create({
      email: 'user-variant-images@test.com',
      passwordHash,
      role: userRole,
      roleId: userRole.id,
      status: UserStatus.ACTIVE,
      authProvider: AuthProvider.LOCAL,
    });
    await userRepository.save(normalUser);

    // Crée un format de test
    const formatRepository = dataSource.getRepository(Format);
    testFormat = formatRepository.create({
      name: 'Test Format Variant Images',
      widthMm: 210,
      heightMm: 297,
      isCustom: false,
      createdBy: adminUser.id,
    });
    await formatRepository.save(testFormat);

    // Crée un matériau de test
    const materialRepository = dataSource.getRepository(Material);
    testMaterial = materialRepository.create({
      name: 'Test Material Variant Images',
      description: 'Matériau de test',
      isActive: true,
      createdBy: adminUser.id,
    });
    await materialRepository.save(testMaterial);

    // Crée un produit de test
    const productRepository = dataSource.getRepository(Product);
    testProduct = productRepository.create({
      name: 'Test Product Variant Images',
      slug: 'test-product-variant-images',
      description: 'Produit pour tester les images de variantes',
      status: ProductStatus.DRAFT,
      featured: false,
      createdBy: adminUser.id,
      tags: [],
    });
    await productRepository.save(testProduct);

    // Crée une variante de test
    const variantRepository = dataSource.getRepository(ProductVariant);
    testVariant = variantRepository.create({
      productId: testProduct.id,
      formatId: testFormat.id,
      materialId: testMaterial.id,
      price: 49.99,
      stockQty: 10,
      status: ProductVariantStatus.AVAILABLE,
      createdBy: adminUser.id,
    });
    await variantRepository.save(testVariant);

    // Récupère les tokens
    const adminLoginResponse = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: 'admin-variant-images@test.com', password: 'password123' });
    adminToken = (adminLoginResponse.body as AuthResponse).accessToken;

    const userLoginResponse = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: 'user-variant-images@test.com', password: 'password123' });
    userToken = (userLoginResponse.body as AuthResponse).accessToken;
  });

  afterAll(async () => {
    // Nettoie les données de test
    await dataSource.query('DELETE FROM activity_logs');
    await dataSource.query('DELETE FROM product_variant_images');
    await dataSource.query('DELETE FROM product_variants WHERE product_id = $1', [testProduct.id]);
    await dataSource.query(`DELETE FROM products WHERE slug = 'test-product-variant-images'`);
    await dataSource.query(`DELETE FROM formats WHERE name = 'Test Format Variant Images'`);
    await dataSource.query(`DELETE FROM materials WHERE name = 'Test Material Variant Images'`);
    await dataSource.query(
      `DELETE FROM users WHERE email IN ('admin-variant-images@test.com', 'user-variant-images@test.com')`,
    );
    await dataSource.destroy();
    await app.close();
  });

  // Recrée une image de test avant chaque test si nécessaire
  beforeEach(async () => {
    // Reset les mocks
    jest.clearAllMocks();

    // Crée une image de test si elle n'existe pas
    const imageRepository = dataSource.getRepository(ProductVariantImage);
    const existingImage = await imageRepository.findOne({
      where: { variantId: testVariant.id },
    });

    if (!existingImage) {
      testImage = imageRepository.create({
        variantId: testVariant.id,
        publicId: 'art-shop/products/test-product-variant-images/variants/test-variant/test-image',
        url: 'https://res.cloudinary.com/demo/image/upload/test.jpg',
        altText: 'Image de test variante',
        position: 0,
        isPrimary: false,
        status: ProductVariantImageStatus.ACTIVE,
        createdById: adminUser.id,
      });
      await imageRepository.save(testImage);
    } else {
      testImage = existingImage;
    }
  });

  // ========================================
  // Tests POST /products/:productId/variants/:variantId/images (Upload)
  // ========================================
  describe('POST /products/:productId/variants/:variantId/images', () => {
    it('devrait uploader une image avec succès pour un ADMIN', () => {
      return request(app.getHttpServer())
        .post(`/products/${testProduct.id}/variants/${testVariant.id}/images`)
        .set('Authorization', `Bearer ${adminToken}`)
        .attach('file', Buffer.from('fake-image-content'), {
          filename: 'test.jpg',
          contentType: 'image/jpeg',
        })
        .field('altText', 'Nouvelle image de variante')
        .field('position', '1')
        .field('isPrimary', 'false')
        .expect(201)
        .expect((res) => {
          const body = res.body as ProductVariantImageResponseDto;
          expect(body).toHaveProperty('id');
          expect(body).toHaveProperty('variantId', testVariant.id);
          expect(body).toHaveProperty('publicId');
          expect(body).toHaveProperty('url');
          expect(body).toHaveProperty('urls');
          expect(body.altText).toBe('Nouvelle image de variante');
          expect(body.position).toBe(1);
          expect(body.isPrimary).toBe(false);
          expect(mockStorageService.uploadVariantImage).toHaveBeenCalled();
        });
    });

    it("devrait refuser l'upload sans authentification", () => {
      return request(app.getHttpServer())
        .post(`/products/${testProduct.id}/variants/${testVariant.id}/images`)
        .attach('file', Buffer.from('fake-image-content'), {
          filename: 'test.jpg',
          contentType: 'image/jpeg',
        })
        .expect(401);
    });

    it("devrait refuser l'upload pour un utilisateur non-admin", () => {
      return request(app.getHttpServer())
        .post(`/products/${testProduct.id}/variants/${testVariant.id}/images`)
        .set('Authorization', `Bearer ${userToken}`)
        .attach('file', Buffer.from('fake-image-content'), {
          filename: 'test.jpg',
          contentType: 'image/jpeg',
        })
        .expect(403);
    });

    it('devrait retourner 404 pour un produit inexistant', () => {
      return request(app.getHttpServer())
        .post(`/products/00000000-0000-0000-0000-000000000000/variants/${testVariant.id}/images`)
        .set('Authorization', `Bearer ${adminToken}`)
        .attach('file', Buffer.from('fake-image-content'), {
          filename: 'test.jpg',
          contentType: 'image/jpeg',
        })
        .expect(404);
    });

    it('devrait retourner 404 pour une variante inexistante', () => {
      return request(app.getHttpServer())
        .post(`/products/${testProduct.id}/variants/00000000-0000-0000-0000-000000000000/images`)
        .set('Authorization', `Bearer ${adminToken}`)
        .attach('file', Buffer.from('fake-image-content'), {
          filename: 'test.jpg',
          contentType: 'image/jpeg',
        })
        .expect(404);
    });

    it('devrait rejeter un UUID de produit invalide', () => {
      return request(app.getHttpServer())
        .post(`/products/invalid-uuid/variants/${testVariant.id}/images`)
        .set('Authorization', `Bearer ${adminToken}`)
        .attach('file', Buffer.from('fake-image-content'), {
          filename: 'test.jpg',
          contentType: 'image/jpeg',
        })
        .expect(400);
    });

    it('devrait rejeter un UUID de variante invalide', () => {
      return request(app.getHttpServer())
        .post(`/products/${testProduct.id}/variants/invalid-uuid/images`)
        .set('Authorization', `Bearer ${adminToken}`)
        .attach('file', Buffer.from('fake-image-content'), {
          filename: 'test.jpg',
          contentType: 'image/jpeg',
        })
        .expect(400);
    });

    it("devrait rejeter l'upload sans fichier", () => {
      return request(app.getHttpServer())
        .post(`/products/${testProduct.id}/variants/${testVariant.id}/images`)
        .set('Authorization', `Bearer ${adminToken}`)
        .field('altText', 'Test sans fichier')
        .expect(400);
    });

    it('devrait uploader une image comme principale et retirer le flag des autres', async () => {
      // Upload une première image comme principale
      await request(app.getHttpServer())
        .post(`/products/${testProduct.id}/variants/${testVariant.id}/images`)
        .set('Authorization', `Bearer ${adminToken}`)
        .attach('file', Buffer.from('fake-image-1'), {
          filename: 'primary1.jpg',
          contentType: 'image/jpeg',
        })
        .field('isPrimary', 'true')
        .expect(201);

      // Upload une seconde image comme principale
      const response = await request(app.getHttpServer())
        .post(`/products/${testProduct.id}/variants/${testVariant.id}/images`)
        .set('Authorization', `Bearer ${adminToken}`)
        .attach('file', Buffer.from('fake-image-2'), {
          filename: 'primary2.jpg',
          contentType: 'image/jpeg',
        })
        .field('isPrimary', 'true')
        .expect(201);

      const body = response.body as ProductVariantImageResponseDto;
      expect(body.isPrimary).toBe(true);

      // Vérifie qu'il n'y a qu'une seule image principale
      const imageRepository = dataSource.getRepository(ProductVariantImage);
      const primaryImages = await imageRepository.find({
        where: { variantId: testVariant.id, isPrimary: true },
      });
      expect(primaryImages.length).toBe(1);
    });
  });

  // ========================================
  // Tests GET /products/:productId/variants/:variantId/images (List)
  // ========================================
  describe('GET /products/:productId/variants/:variantId/images', () => {
    it("devrait retourner la liste des images d'une variante", () => {
      return request(app.getHttpServer())
        .get(`/products/${testProduct.id}/variants/${testVariant.id}/images`)
        .expect(200)
        .expect((res) => {
          const body = res.body as ProductVariantImageResponseDto[];
          expect(Array.isArray(body)).toBe(true);
          if (body.length > 0) {
            expect(body[0]).toHaveProperty('id');
            expect(body[0]).toHaveProperty('variantId');
            expect(body[0]).toHaveProperty('urls');
          }
        });
    });

    it('devrait retourner un tableau vide pour une variante sans images', async () => {
      // Crée une variante sans images
      const variantRepository = dataSource.getRepository(ProductVariant);
      const emptyVariant = variantRepository.create({
        productId: testProduct.id,
        formatId: testFormat.id,
        materialId: testMaterial.id,
        price: 29.99,
        stockQty: 5,
        status: ProductVariantStatus.AVAILABLE,
        createdBy: adminUser.id,
      });

      // Modifie un peu pour éviter le conflit d'unicité
      const formatRepository = dataSource.getRepository(Format);
      const newFormat = formatRepository.create({
        name: 'Format Empty Variant',
        widthMm: 100,
        heightMm: 100,
        isCustom: true,
        createdBy: adminUser.id,
      });
      await formatRepository.save(newFormat);

      emptyVariant.formatId = newFormat.id;
      await variantRepository.save(emptyVariant);

      const response = await request(app.getHttpServer())
        .get(`/products/${testProduct.id}/variants/${emptyVariant.id}/images`)
        .expect(200);

      expect(response.body).toEqual([]);

      // Nettoie
      await variantRepository.remove(emptyVariant);
      await formatRepository.remove(newFormat);
    });

    it('devrait retourner 404 pour un produit inexistant', () => {
      return request(app.getHttpServer())
        .get(`/products/00000000-0000-0000-0000-000000000000/variants/${testVariant.id}/images`)
        .expect(404);
    });

    it('devrait retourner 404 pour une variante inexistante', () => {
      return request(app.getHttpServer())
        .get(`/products/${testProduct.id}/variants/00000000-0000-0000-0000-000000000000/images`)
        .expect(404);
    });

    it('devrait retourner les images triées par position puis createdAt', async () => {
      // Nettoie les images existantes
      const imageRepository = dataSource.getRepository(ProductVariantImage);
      await imageRepository.delete({ variantId: testVariant.id });

      // Crée plusieurs images avec des positions différentes
      const image1 = imageRepository.create({
        variantId: testVariant.id,
        publicId: 'test/variant-image1',
        url: 'https://example.com/1.jpg',
        position: 2,
        isPrimary: false,
        status: ProductVariantImageStatus.ACTIVE,
        createdById: adminUser.id,
      });
      const image2 = imageRepository.create({
        variantId: testVariant.id,
        publicId: 'test/variant-image2',
        url: 'https://example.com/2.jpg',
        position: 0,
        isPrimary: true,
        status: ProductVariantImageStatus.ACTIVE,
        createdById: adminUser.id,
      });
      const image3 = imageRepository.create({
        variantId: testVariant.id,
        publicId: 'test/variant-image3',
        url: 'https://example.com/3.jpg',
        position: 1,
        isPrimary: false,
        status: ProductVariantImageStatus.ACTIVE,
        createdById: adminUser.id,
      });

      await imageRepository.save([image1, image2, image3]);

      const response = await request(app.getHttpServer())
        .get(`/products/${testProduct.id}/variants/${testVariant.id}/images`)
        .expect(200);

      const body = response.body as ProductVariantImageResponseDto[];
      expect(body.length).toBe(3);
      expect(body[0].position).toBe(0);
      expect(body[1].position).toBe(1);
      expect(body[2].position).toBe(2);
    });
  });

  // ========================================
  // Tests GET /products/:productId/variants/:variantId/images/:imageId (Get One)
  // ========================================
  describe('GET /products/:productId/variants/:variantId/images/:imageId', () => {
    it('devrait retourner une image spécifique', () => {
      return request(app.getHttpServer())
        .get(`/products/${testProduct.id}/variants/${testVariant.id}/images/${testImage.id}`)
        .expect(200)
        .expect((res) => {
          const body = res.body as ProductVariantImageResponseDto;
          expect(body.id).toBe(testImage.id);
          expect(body.variantId).toBe(testVariant.id);
          expect(body).toHaveProperty('urls');
        });
    });

    it('devrait retourner 404 pour une image inexistante', () => {
      return request(app.getHttpServer())
        .get(`/products/${testProduct.id}/variants/${testVariant.id}/images/00000000-0000-0000-0000-000000000000`)
        .expect(404);
    });

    it('devrait rejeter un UUID invalide', () => {
      return request(app.getHttpServer())
        .get(`/products/${testProduct.id}/variants/${testVariant.id}/images/invalid-uuid`)
        .expect(400);
    });
  });

  // ========================================
  // Tests PATCH /products/:productId/variants/:variantId/images/:imageId (Update)
  // ========================================
  describe('PATCH /products/:productId/variants/:variantId/images/:imageId', () => {
    it("devrait mettre à jour les métadonnées d'une image", () => {
      return request(app.getHttpServer())
        .patch(`/products/${testProduct.id}/variants/${testVariant.id}/images/${testImage.id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          altText: 'Nouveau texte alternatif variante',
          position: 5,
        })
        .expect(200)
        .expect((res) => {
          const body = res.body as ProductVariantImageResponseDto;
          expect(body.altText).toBe('Nouveau texte alternatif variante');
          expect(body.position).toBe(5);
        });
    });

    it("devrait mettre à jour le statut d'une image", () => {
      return request(app.getHttpServer())
        .patch(`/products/${testProduct.id}/variants/${testVariant.id}/images/${testImage.id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          status: ProductVariantImageStatus.INACTIVE,
        })
        .expect(200)
        .expect((res) => {
          const body = res.body as ProductVariantImageResponseDto;
          expect(body.status).toBe(ProductVariantImageStatus.INACTIVE);
        });
    });

    it('devrait refuser la mise à jour sans authentification', () => {
      return request(app.getHttpServer())
        .patch(`/products/${testProduct.id}/variants/${testVariant.id}/images/${testImage.id}`)
        .send({ altText: 'Test' })
        .expect(401);
    });

    it('devrait refuser la mise à jour pour un utilisateur non-admin', () => {
      return request(app.getHttpServer())
        .patch(`/products/${testProduct.id}/variants/${testVariant.id}/images/${testImage.id}`)
        .set('Authorization', `Bearer ${userToken}`)
        .send({ altText: 'Test' })
        .expect(403);
    });

    it('devrait retourner 404 pour une image inexistante', () => {
      return request(app.getHttpServer())
        .patch(`/products/${testProduct.id}/variants/${testVariant.id}/images/00000000-0000-0000-0000-000000000000`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ altText: 'Test' })
        .expect(404);
    });

    it('devrait rejeter une position négative', () => {
      return request(app.getHttpServer())
        .patch(`/products/${testProduct.id}/variants/${testVariant.id}/images/${testImage.id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ position: -1 })
        .expect(400);
    });

    it('devrait rejeter un statut invalide', () => {
      return request(app.getHttpServer())
        .patch(`/products/${testProduct.id}/variants/${testVariant.id}/images/${testImage.id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ status: 'INVALID_STATUS' })
        .expect(400);
    });
  });

  // ========================================
  // Tests PATCH /products/:productId/variants/:variantId/images/:imageId/primary (Set Primary)
  // ========================================
  describe('PATCH /products/:productId/variants/:variantId/images/:imageId/primary', () => {
    it('devrait définir une image comme principale', async () => {
      // Assure que l'image n'est pas principale
      const imageRepository = dataSource.getRepository(ProductVariantImage);
      await imageRepository.update(testImage.id, { isPrimary: false });

      return request(app.getHttpServer())
        .patch(`/products/${testProduct.id}/variants/${testVariant.id}/images/${testImage.id}/primary`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200)
        .expect((res) => {
          const body = res.body as ProductVariantImageResponseDto;
          expect(body.isPrimary).toBe(true);
        });
    });

    it("devrait retourner l'image si elle est déjà principale", async () => {
      // Définit l'image comme principale
      const imageRepository = dataSource.getRepository(ProductVariantImage);
      await imageRepository.update(testImage.id, { isPrimary: true });

      return request(app.getHttpServer())
        .patch(`/products/${testProduct.id}/variants/${testVariant.id}/images/${testImage.id}/primary`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200)
        .expect((res) => {
          const body = res.body as ProductVariantImageResponseDto;
          expect(body.isPrimary).toBe(true);
        });
    });

    it('devrait retirer le flag isPrimary des autres images', async () => {
      const imageRepository = dataSource.getRepository(ProductVariantImage);

      // Crée une seconde image comme principale
      const otherImage = imageRepository.create({
        variantId: testVariant.id,
        publicId: 'test/other-variant-primary',
        url: 'https://example.com/other.jpg',
        position: 10,
        isPrimary: true,
        status: ProductVariantImageStatus.ACTIVE,
        createdById: adminUser.id,
      });
      await imageRepository.save(otherImage);

      // Définit testImage comme principale
      await request(app.getHttpServer())
        .patch(`/products/${testProduct.id}/variants/${testVariant.id}/images/${testImage.id}/primary`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      // Vérifie qu'il n'y a qu'une seule image principale
      const primaryImages = await imageRepository.find({
        where: { variantId: testVariant.id, isPrimary: true },
      });
      expect(primaryImages.length).toBe(1);
      expect(primaryImages[0].id).toBe(testImage.id);

      // Nettoie
      await imageRepository.remove(otherImage);
    });

    it('devrait refuser sans authentification', () => {
      return request(app.getHttpServer())
        .patch(`/products/${testProduct.id}/variants/${testVariant.id}/images/${testImage.id}/primary`)
        .expect(401);
    });

    it('devrait refuser pour un utilisateur non-admin', () => {
      return request(app.getHttpServer())
        .patch(`/products/${testProduct.id}/variants/${testVariant.id}/images/${testImage.id}/primary`)
        .set('Authorization', `Bearer ${userToken}`)
        .expect(403);
    });
  });

  // ========================================
  // Tests DELETE /products/:productId/variants/:variantId/images/:imageId
  // ========================================
  describe('DELETE /products/:productId/variants/:variantId/images/:imageId', () => {
    it('devrait supprimer une image avec succès', async () => {
      // Crée une image à supprimer
      const imageRepository = dataSource.getRepository(ProductVariantImage);
      const imageToDelete = imageRepository.create({
        variantId: testVariant.id,
        publicId: 'test/variant-to-delete',
        url: 'https://example.com/delete.jpg',
        position: 99,
        isPrimary: false,
        status: ProductVariantImageStatus.ACTIVE,
        createdById: adminUser.id,
      });
      await imageRepository.save(imageToDelete);

      await request(app.getHttpServer())
        .delete(`/products/${testProduct.id}/variants/${testVariant.id}/images/${imageToDelete.id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(204);

      // Vérifie que l'image a été supprimée
      const deletedImage = await imageRepository.findOne({ where: { id: imageToDelete.id } });
      expect(deletedImage).toBeNull();

      // Vérifie que deleteImage a été appelé sur Cloudinary
      expect(mockStorageService.deleteImage).toHaveBeenCalledWith('test/variant-to-delete');
    });

    it('devrait refuser la suppression sans authentification', () => {
      return request(app.getHttpServer())
        .delete(`/products/${testProduct.id}/variants/${testVariant.id}/images/${testImage.id}`)
        .expect(401);
    });

    it('devrait refuser la suppression pour un utilisateur non-admin', () => {
      return request(app.getHttpServer())
        .delete(`/products/${testProduct.id}/variants/${testVariant.id}/images/${testImage.id}`)
        .set('Authorization', `Bearer ${userToken}`)
        .expect(403);
    });

    it('devrait retourner 404 pour une image inexistante', () => {
      return request(app.getHttpServer())
        .delete(`/products/${testProduct.id}/variants/${testVariant.id}/images/00000000-0000-0000-0000-000000000000`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(404);
    });

    it('devrait supprimer de la BDD même si Cloudinary échoue', async () => {
      // Configure le mock pour échouer
      mockStorageService.deleteImage.mockRejectedValueOnce(new Error('Cloudinary error'));

      // Crée une image à supprimer
      const imageRepository = dataSource.getRepository(ProductVariantImage);
      const imageToDelete = imageRepository.create({
        variantId: testVariant.id,
        publicId: 'test/variant-cloudinary-fail',
        url: 'https://example.com/fail.jpg',
        position: 88,
        isPrimary: false,
        status: ProductVariantImageStatus.ACTIVE,
        createdById: adminUser.id,
      });
      await imageRepository.save(imageToDelete);

      await request(app.getHttpServer())
        .delete(`/products/${testProduct.id}/variants/${testVariant.id}/images/${imageToDelete.id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(204);

      // Vérifie que l'image a été supprimée de la BDD malgré l'erreur Cloudinary
      const deletedImage = await imageRepository.findOne({ where: { id: imageToDelete.id } });
      expect(deletedImage).toBeNull();
    });
  });
});
