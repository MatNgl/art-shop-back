import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { DataSource } from 'typeorm';
import { Role } from '../src/modules/roles/entities/role.entity';
import { User, UserStatus, AuthProvider } from '../src/modules/users/entities/user.entity';
import { Category } from '../src/modules/catalog/entities/category.entity';
import * as bcrypt from 'bcrypt';

// Types pour les réponses API
interface AuthResponse {
  accessToken: string;
  user: {
    id: string;
    email: string;
  };
}

interface CategoryResponseDto {
  id: string;
  name: string;
  slug: string;
  position: number;
  subcategoriesCount: number;
  createdBy: string;
  createdAt: string;
  modifiedBy?: string;
  updatedAt: string;
}

interface CategoryWithSubcategoriesResponseDto extends CategoryResponseDto {
  subcategories: Array<{
    id: string;
    name: string;
    slug: string;
    position: number;
    categoryId: string;
  }>;
}

describe('Categories (e2e)', () => {
  let app: INestApplication;
  let dataSource: DataSource;
  let adminToken: string;
  let userToken: string;
  let adminUser: User;
  let normalUser: User;
  let testCategory: Category;
  let adminRole: Role;
  let userRole: Role;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

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
      email: 'admin-categories@test.com',
      passwordHash,
      role: adminRole,
      roleId: adminRole.id,
      status: UserStatus.ACTIVE,
      authProvider: AuthProvider.LOCAL,
    });
    await userRepository.save(adminUser);

    normalUser = userRepository.create({
      email: 'user-categories@test.com',
      passwordHash,
      role: userRole,
      roleId: userRole.id,
      status: UserStatus.ACTIVE,
      authProvider: AuthProvider.LOCAL,
    });
    await userRepository.save(normalUser);

    // Récupère les tokens
    const adminLoginResponse = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: 'admin-categories@test.com', password: 'password123' });
    adminToken = (adminLoginResponse.body as AuthResponse).accessToken;

    const userLoginResponse = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: 'user-categories@test.com', password: 'password123' });
    userToken = (userLoginResponse.body as AuthResponse).accessToken;
  });

  afterAll(async () => {
    // Nettoie les données de test
    await dataSource.query('DELETE FROM activity_logs');
    await dataSource.query(
      `DELETE FROM subcategories WHERE category_id IN (SELECT id FROM categories WHERE slug LIKE 'test-%')`,
    );
    await dataSource.query(`DELETE FROM categories WHERE slug LIKE 'test-%'`);
    await dataSource.query(
      `DELETE FROM users WHERE email IN ('admin-categories@test.com', 'user-categories@test.com')`,
    );
    await dataSource.destroy();
    await app.close();
  });

  beforeEach(async () => {
    // Crée une catégorie de test si elle n'existe pas
    const categoryRepository = dataSource.getRepository(Category);
    const existingCategory = await categoryRepository.findOne({
      where: { slug: 'test-category-e2e' },
    });

    if (!existingCategory) {
      testCategory = categoryRepository.create({
        name: 'Test Category E2E',
        slug: 'test-category-e2e',
        position: 0,
        createdBy: adminUser.id,
      });
      await categoryRepository.save(testCategory);
    } else {
      testCategory = existingCategory;
    }
  });

  // ========================================
  // Tests POST /categories (Create)
  // ========================================
  describe('POST /categories', () => {
    it('devrait créer une catégorie avec succès pour un ADMIN', async () => {
      const response = await request(app.getHttpServer())
        .post('/categories')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          name: 'Test Nouvelle Catégorie',
          position: 1,
        })
        .expect(201);

      const body = response.body as CategoryResponseDto;
      expect(body).toHaveProperty('id');
      expect(body.name).toBe('Test Nouvelle Catégorie');
      expect(body.slug).toBe('test-nouvelle-categorie');
      expect(body.position).toBe(1);
      expect(body.subcategoriesCount).toBe(0);

      // Nettoie
      await dataSource.getRepository(Category).delete(body.id);
    });

    it('devrait créer une catégorie avec un slug personnalisé', async () => {
      const response = await request(app.getHttpServer())
        .post('/categories')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          name: 'Test Custom Slug',
          slug: 'test-mon-slug-custom',
          position: 2,
        })
        .expect(201);

      const body = response.body as CategoryResponseDto;
      expect(body.slug).toBe('test-mon-slug-custom');

      // Nettoie
      await dataSource.getRepository(Category).delete(body.id);
    });

    it('devrait générer automatiquement le slug avec accents', async () => {
      const response = await request(app.getHttpServer())
        .post('/categories')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          name: 'Test Été Français',
          position: 0,
        })
        .expect(201);

      const body = response.body as CategoryResponseDto;
      expect(body.slug).toBe('test-ete-francais');

      // Nettoie
      await dataSource.getRepository(Category).delete(body.id);
    });

    it('devrait refuser la création sans authentification', () => {
      return request(app.getHttpServer()).post('/categories').send({ name: 'Test Sans Auth', position: 0 }).expect(401);
    });

    it('devrait refuser la création pour un utilisateur non-admin', () => {
      return request(app.getHttpServer())
        .post('/categories')
        .set('Authorization', `Bearer ${userToken}`)
        .send({ name: 'Test User', position: 0 })
        .expect(403);
    });

    it('devrait retourner 409 si le nom existe déjà', async () => {
      return request(app.getHttpServer())
        .post('/categories')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          name: 'Test Category E2E', // Nom déjà utilisé par testCategory
          position: 0,
        })
        .expect(409);
    });

    it('devrait retourner 409 si le slug existe déjà', async () => {
      return request(app.getHttpServer())
        .post('/categories')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          name: 'Test Autre Nom',
          slug: 'test-category-e2e', // Slug déjà utilisé
          position: 0,
        })
        .expect(409);
    });

    it('devrait rejeter un nom vide', () => {
      return request(app.getHttpServer())
        .post('/categories')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ name: '', position: 0 })
        .expect(400);
    });

    it('devrait rejeter une position négative', () => {
      return request(app.getHttpServer())
        .post('/categories')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ name: 'Test Position', position: -1 })
        .expect(400);
    });
  });

  // ========================================
  // Tests GET /categories (List)
  // ========================================
  describe('GET /categories', () => {
    it('devrait retourner la liste des catégories (accès public)', async () => {
      const response = await request(app.getHttpServer()).get('/categories').expect(200);

      const body = response.body as CategoryResponseDto[];
      expect(Array.isArray(body)).toBe(true);
      expect(body.length).toBeGreaterThan(0);
      expect(body[0]).toHaveProperty('id');
      expect(body[0]).toHaveProperty('name');
      expect(body[0]).toHaveProperty('slug');
      expect(body[0]).toHaveProperty('subcategoriesCount');
    });

    it('devrait retourner les catégories avec sous-catégories si demandé', async () => {
      const response = await request(app.getHttpServer()).get('/categories?includeSubcategories=true').expect(200);

      const body = response.body as CategoryWithSubcategoriesResponseDto[];
      expect(Array.isArray(body)).toBe(true);
      if (body.length > 0) {
        expect(body[0]).toHaveProperty('subcategories');
        expect(Array.isArray(body[0].subcategories)).toBe(true);
      }
    });

    it('devrait retourner les catégories triées par position puis nom', async () => {
      // Crée des catégories avec positions différentes
      const categoryRepository = dataSource.getRepository(Category);
      const cat1 = categoryRepository.create({
        name: 'Test Z Category',
        slug: 'test-z-category',
        position: 1,
        createdBy: adminUser.id,
      });
      const cat2 = categoryRepository.create({
        name: 'Test A Category',
        slug: 'test-a-category',
        position: 0,
        createdBy: adminUser.id,
      });
      await categoryRepository.save([cat1, cat2]);

      const response = await request(app.getHttpServer()).get('/categories').expect(200);

      const body = response.body as CategoryResponseDto[];
      const testCategories = body.filter((c) => c.slug.startsWith('test-'));

      // Vérifie que position 0 vient avant position 1
      const cat2Index = testCategories.findIndex((c) => c.slug === 'test-a-category');
      const cat1Index = testCategories.findIndex((c) => c.slug === 'test-z-category');
      expect(cat2Index).toBeLessThan(cat1Index);

      // Nettoie
      await categoryRepository.delete([cat1.id, cat2.id]);
    });
  });

  // ========================================
  // Tests GET /categories/:id (Get One)
  // ========================================
  describe('GET /categories/:id', () => {
    it('devrait retourner une catégorie par ID (accès public)', async () => {
      const response = await request(app.getHttpServer()).get(`/categories/${testCategory.id}`).expect(200);

      const body = response.body as CategoryResponseDto;
      expect(body.id).toBe(testCategory.id);
      expect(body.name).toBe(testCategory.name);
      expect(body.slug).toBe(testCategory.slug);
    });

    it('devrait retourner 404 pour une catégorie inexistante', () => {
      return request(app.getHttpServer()).get('/categories/00000000-0000-0000-0000-000000000000').expect(404);
    });

    it('devrait rejeter un UUID invalide', () => {
      return request(app.getHttpServer()).get('/categories/invalid-uuid').expect(400);
    });
  });

  // ========================================
  // Tests GET /categories/slug/:slug (Get by Slug)
  // ========================================
  describe('GET /categories/slug/:slug', () => {
    it('devrait retourner une catégorie par slug (accès public)', async () => {
      const response = await request(app.getHttpServer()).get(`/categories/slug/${testCategory.slug}`).expect(200);

      const body = response.body as CategoryResponseDto;
      expect(body.slug).toBe(testCategory.slug);
      expect(body.name).toBe(testCategory.name);
    });

    it('devrait retourner 404 pour un slug inexistant', () => {
      return request(app.getHttpServer()).get('/categories/slug/slug-inexistant-xyz').expect(404);
    });
  });

  // ========================================
  // Tests PATCH /categories/:id (Update)
  // ========================================
  describe('PATCH /categories/:id', () => {
    it('devrait mettre à jour le nom avec succès', async () => {
      const response = await request(app.getHttpServer())
        .patch(`/categories/${testCategory.id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ name: 'Test Category Updated' })
        .expect(200);

      const body = response.body as CategoryResponseDto;
      expect(body.name).toBe('Test Category Updated');

      // Restaure le nom original
      await dataSource.getRepository(Category).update(testCategory.id, { name: testCategory.name });
    });

    it('devrait mettre à jour le slug avec succès', async () => {
      const response = await request(app.getHttpServer())
        .patch(`/categories/${testCategory.id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ slug: 'test-category-e2e-updated' })
        .expect(200);

      const body = response.body as CategoryResponseDto;
      expect(body.slug).toBe('test-category-e2e-updated');

      // Restaure le slug original
      await dataSource.getRepository(Category).update(testCategory.id, { slug: testCategory.slug });
    });

    it('devrait mettre à jour la position avec succès', async () => {
      const response = await request(app.getHttpServer())
        .patch(`/categories/${testCategory.id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ position: 99 })
        .expect(200);

      const body = response.body as CategoryResponseDto;
      expect(body.position).toBe(99);

      // Restaure la position originale
      await dataSource.getRepository(Category).update(testCategory.id, { position: testCategory.position });
    });

    it('devrait refuser la mise à jour sans authentification', () => {
      return request(app.getHttpServer()).patch(`/categories/${testCategory.id}`).send({ name: 'Test' }).expect(401);
    });

    it('devrait refuser la mise à jour pour un utilisateur non-admin', () => {
      return request(app.getHttpServer())
        .patch(`/categories/${testCategory.id}`)
        .set('Authorization', `Bearer ${userToken}`)
        .send({ name: 'Test' })
        .expect(403);
    });

    it('devrait retourner 404 pour une catégorie inexistante', () => {
      return request(app.getHttpServer())
        .patch('/categories/00000000-0000-0000-0000-000000000000')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ name: 'Test' })
        .expect(404);
    });

    it('devrait retourner 409 si le nouveau nom existe déjà', async () => {
      // Crée une autre catégorie
      const categoryRepository = dataSource.getRepository(Category);
      const otherCategory = categoryRepository.create({
        name: 'Test Autre Catégorie Conflit',
        slug: 'test-autre-categorie-conflit',
        position: 0,
        createdBy: adminUser.id,
      });
      await categoryRepository.save(otherCategory);

      await request(app.getHttpServer())
        .patch(`/categories/${testCategory.id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ name: 'Test Autre Catégorie Conflit' })
        .expect(409);

      // Nettoie
      await categoryRepository.delete(otherCategory.id);
    });

    it('devrait permettre de garder le même nom sans conflit', () => {
      return request(app.getHttpServer())
        .patch(`/categories/${testCategory.id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ name: testCategory.name })
        .expect(200);
    });
  });

  // ========================================
  // Tests DELETE /categories/:id
  // ========================================
  describe('DELETE /categories/:id', () => {
    it('devrait supprimer une catégorie avec succès', async () => {
      // Crée une catégorie à supprimer
      const categoryRepository = dataSource.getRepository(Category);
      const categoryToDelete = categoryRepository.create({
        name: 'Test Catégorie À Supprimer',
        slug: 'test-categorie-a-supprimer',
        position: 0,
        createdBy: adminUser.id,
      });
      await categoryRepository.save(categoryToDelete);

      await request(app.getHttpServer())
        .delete(`/categories/${categoryToDelete.id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(204);

      // Vérifie que la catégorie a été supprimée
      const deletedCategory = await categoryRepository.findOne({ where: { id: categoryToDelete.id } });
      expect(deletedCategory).toBeNull();
    });

    it('devrait refuser la suppression sans authentification', () => {
      return request(app.getHttpServer()).delete(`/categories/${testCategory.id}`).expect(401);
    });

    it('devrait refuser la suppression pour un utilisateur non-admin', () => {
      return request(app.getHttpServer())
        .delete(`/categories/${testCategory.id}`)
        .set('Authorization', `Bearer ${userToken}`)
        .expect(403);
    });

    it('devrait retourner 404 pour une catégorie inexistante', () => {
      return request(app.getHttpServer())
        .delete('/categories/00000000-0000-0000-0000-000000000000')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(404);
    });
  });
});
