import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { DataSource } from 'typeorm';
import { Role } from '../src/modules/roles/entities/role.entity';
import { User, UserStatus, AuthProvider } from '../src/modules/users/entities/user.entity';
import { Category } from '../src/modules/catalog/entities/category.entity';
import { Subcategory } from '../src/modules/catalog/entities/subcategory.entity';
import * as bcrypt from 'bcrypt';

// Types pour les réponses API
interface AuthResponse {
  accessToken: string;
  user: {
    id: string;
    email: string;
  };
}

interface SubcategoryResponseDto {
  id: string;
  name: string;
  slug: string;
  position: number;
  categoryId: string;
  createdBy: string;
  createdAt: string;
  modifiedBy?: string;
  updatedAt: string;
}

interface SubcategoryWithCategoryResponseDto extends SubcategoryResponseDto {
  category: {
    id: string;
    name: string;
    slug: string;
  };
}

describe('Subcategories (e2e)', () => {
  let app: INestApplication;
  let dataSource: DataSource;
  let adminToken: string;
  let userToken: string;
  let adminUser: User;
  let normalUser: User;
  let testCategory: Category;
  let testSubcategory: Subcategory;
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
      email: 'admin-subcategories@test.com',
      passwordHash,
      role: adminRole,
      roleId: adminRole.id,
      status: UserStatus.ACTIVE,
      authProvider: AuthProvider.LOCAL,
    });
    await userRepository.save(adminUser);

    normalUser = userRepository.create({
      email: 'user-subcategories@test.com',
      passwordHash,
      role: userRole,
      roleId: userRole.id,
      status: UserStatus.ACTIVE,
      authProvider: AuthProvider.LOCAL,
    });
    await userRepository.save(normalUser);

    // Crée une catégorie de test
    const categoryRepository = dataSource.getRepository(Category);
    testCategory = categoryRepository.create({
      name: 'Test Category Sub E2E',
      slug: 'test-category-sub-e2e',
      position: 0,
      createdBy: adminUser.id,
    });
    await categoryRepository.save(testCategory);

    // Récupère les tokens
    const adminLoginResponse = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: 'admin-subcategories@test.com', password: 'password123' });
    adminToken = (adminLoginResponse.body as AuthResponse).accessToken;

    const userLoginResponse = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: 'user-subcategories@test.com', password: 'password123' });
    userToken = (userLoginResponse.body as AuthResponse).accessToken;
  });

  afterAll(async () => {
    // Nettoie les données de test
    await dataSource.query('DELETE FROM activity_logs');
    await dataSource.query(`DELETE FROM subcategories WHERE slug LIKE 'test-%'`);
    await dataSource.query(`DELETE FROM categories WHERE slug LIKE 'test-%'`);
    await dataSource.query(
      `DELETE FROM users WHERE email IN ('admin-subcategories@test.com', 'user-subcategories@test.com')`,
    );
    await dataSource.destroy();
    await app.close();
  });

  beforeEach(async () => {
    // Crée une sous-catégorie de test si elle n'existe pas
    const subcategoryRepository = dataSource.getRepository(Subcategory);
    const existingSubcategory = await subcategoryRepository.findOne({
      where: { slug: 'test-subcategory-e2e' },
    });

    if (!existingSubcategory) {
      testSubcategory = subcategoryRepository.create({
        name: 'Test Subcategory E2E',
        slug: 'test-subcategory-e2e',
        position: 0,
        categoryId: testCategory.id,
        createdBy: adminUser.id,
      });
      await subcategoryRepository.save(testSubcategory);
    } else {
      testSubcategory = existingSubcategory;
    }
  });

  // ========================================
  // Tests POST /categories/:categoryId/subcategories (Create)
  // ========================================
  describe('POST /categories/:categoryId/subcategories', () => {
    it('devrait créer une sous-catégorie avec succès pour un ADMIN', async () => {
      const response = await request(app.getHttpServer())
        .post(`/categories/${testCategory.id}/subcategories`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          name: 'Test Nouvelle Sous-Catégorie',
          position: 1,
        })
        .expect(201);

      const body = response.body as SubcategoryResponseDto;
      expect(body).toHaveProperty('id');
      expect(body.name).toBe('Test Nouvelle Sous-Catégorie');
      expect(body.slug).toBe('test-nouvelle-sous-categorie');
      expect(body.position).toBe(1);
      expect(body.categoryId).toBe(testCategory.id);

      // Nettoie
      await dataSource.getRepository(Subcategory).delete(body.id);
    });

    it('devrait créer une sous-catégorie avec un slug personnalisé', async () => {
      const response = await request(app.getHttpServer())
        .post(`/categories/${testCategory.id}/subcategories`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          name: 'Test Custom Slug Sub',
          slug: 'test-mon-slug-sub-custom',
          position: 2,
        })
        .expect(201);

      const body = response.body as SubcategoryResponseDto;
      expect(body.slug).toBe('test-mon-slug-sub-custom');

      // Nettoie
      await dataSource.getRepository(Subcategory).delete(body.id);
    });

    it('devrait générer automatiquement le slug avec accents', async () => {
      const response = await request(app.getHttpServer())
        .post(`/categories/${testCategory.id}/subcategories`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          name: 'Test Été Français Sub',
          position: 0,
        })
        .expect(201);

      const body = response.body as SubcategoryResponseDto;
      expect(body.slug).toBe('test-ete-francais-sub');

      // Nettoie
      await dataSource.getRepository(Subcategory).delete(body.id);
    });

    it('devrait refuser la création sans authentification', () => {
      return request(app.getHttpServer())
        .post(`/categories/${testCategory.id}/subcategories`)
        .send({ name: 'Test Sans Auth', position: 0 })
        .expect(401);
    });

    it('devrait refuser la création pour un utilisateur non-admin', () => {
      return request(app.getHttpServer())
        .post(`/categories/${testCategory.id}/subcategories`)
        .set('Authorization', `Bearer ${userToken}`)
        .send({ name: 'Test User', position: 0 })
        .expect(403);
    });

    it("devrait retourner 404 si la catégorie parente n'existe pas", () => {
      return request(app.getHttpServer())
        .post('/categories/00000000-0000-0000-0000-000000000000/subcategories')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ name: 'Test Orphan', position: 0 })
        .expect(404);
    });

    it('devrait retourner 409 si le slug existe déjà (global)', async () => {
      return request(app.getHttpServer())
        .post(`/categories/${testCategory.id}/subcategories`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          name: 'Test Autre Nom',
          slug: 'test-subcategory-e2e', // Slug déjà utilisé
          position: 0,
        })
        .expect(409);
    });

    it('devrait retourner 409 si le nom existe déjà dans la catégorie', async () => {
      return request(app.getHttpServer())
        .post(`/categories/${testCategory.id}/subcategories`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          name: 'Test Subcategory E2E', // Nom déjà utilisé dans cette catégorie
          position: 0,
        })
        .expect(409);
    });

    it('devrait rejeter un nom vide', () => {
      return request(app.getHttpServer())
        .post(`/categories/${testCategory.id}/subcategories`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ name: '', position: 0 })
        .expect(400);
    });

    it('devrait rejeter une position négative', () => {
      return request(app.getHttpServer())
        .post(`/categories/${testCategory.id}/subcategories`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ name: 'Test Position', position: -1 })
        .expect(400);
    });
  });

  // ========================================
  // Tests GET /categories/:categoryId/subcategories (List by Category)
  // ========================================
  describe('GET /categories/:categoryId/subcategories', () => {
    it("devrait retourner les sous-catégories d'une catégorie (accès public)", async () => {
      const response = await request(app.getHttpServer())
        .get(`/categories/${testCategory.id}/subcategories`)
        .expect(200);

      const body = response.body as SubcategoryResponseDto[];
      expect(Array.isArray(body)).toBe(true);
      if (body.length > 0) {
        expect(body[0]).toHaveProperty('id');
        expect(body[0]).toHaveProperty('name');
        expect(body[0]).toHaveProperty('slug');
        expect(body[0].categoryId).toBe(testCategory.id);
      }
    });

    it('devrait retourner un tableau vide pour une catégorie sans sous-catégories', async () => {
      // Crée une catégorie vide
      const categoryRepository = dataSource.getRepository(Category);
      const emptyCategory = categoryRepository.create({
        name: 'Test Catégorie Vide',
        slug: 'test-categorie-vide',
        position: 0,
        createdBy: adminUser.id,
      });
      await categoryRepository.save(emptyCategory);

      const response = await request(app.getHttpServer())
        .get(`/categories/${emptyCategory.id}/subcategories`)
        .expect(200);

      expect(response.body).toEqual([]);

      // Nettoie
      await categoryRepository.delete(emptyCategory.id);
    });

    it("devrait retourner 404 si la catégorie n'existe pas", () => {
      return request(app.getHttpServer())
        .get('/categories/00000000-0000-0000-0000-000000000000/subcategories')
        .expect(404);
    });
  });

  // ========================================
  // Tests GET /subcategories (List All)
  // ========================================
  describe('GET /subcategories', () => {
    it('devrait retourner toutes les sous-catégories avec leurs catégories (accès public)', async () => {
      const response = await request(app.getHttpServer()).get('/subcategories').expect(200);

      const body = response.body as SubcategoryWithCategoryResponseDto[];
      expect(Array.isArray(body)).toBe(true);
      if (body.length > 0) {
        expect(body[0]).toHaveProperty('category');
        expect(body[0].category).toHaveProperty('id');
        expect(body[0].category).toHaveProperty('name');
        expect(body[0].category).toHaveProperty('slug');
      }
    });
  });

  // ========================================
  // Tests GET /subcategories/:id (Get One)
  // ========================================
  describe('GET /subcategories/:id', () => {
    it('devrait retourner une sous-catégorie par ID (accès public)', async () => {
      const response = await request(app.getHttpServer()).get(`/subcategories/${testSubcategory.id}`).expect(200);

      const body = response.body as SubcategoryResponseDto;
      expect(body.id).toBe(testSubcategory.id);
      expect(body.name).toBe(testSubcategory.name);
      expect(body.slug).toBe(testSubcategory.slug);
    });

    it('devrait retourner 404 pour une sous-catégorie inexistante', () => {
      return request(app.getHttpServer()).get('/subcategories/00000000-0000-0000-0000-000000000000').expect(404);
    });

    it('devrait rejeter un UUID invalide', () => {
      return request(app.getHttpServer()).get('/subcategories/invalid-uuid').expect(400);
    });
  });

  // ========================================
  // Tests GET /subcategories/slug/:slug (Get by Slug)
  // ========================================
  describe('GET /subcategories/slug/:slug', () => {
    it('devrait retourner une sous-catégorie par slug avec sa catégorie (accès public)', async () => {
      const response = await request(app.getHttpServer())
        .get(`/subcategories/slug/${testSubcategory.slug}`)
        .expect(200);

      const body = response.body as SubcategoryWithCategoryResponseDto;
      expect(body.slug).toBe(testSubcategory.slug);
      expect(body).toHaveProperty('category');
      expect(body.category.id).toBe(testCategory.id);
    });

    it('devrait retourner 404 pour un slug inexistant', () => {
      return request(app.getHttpServer()).get('/subcategories/slug/slug-inexistant-xyz').expect(404);
    });
  });

  // ========================================
  // Tests PATCH /subcategories/:id (Update)
  // ========================================
  describe('PATCH /subcategories/:id', () => {
    it('devrait mettre à jour le nom avec succès', async () => {
      const response = await request(app.getHttpServer())
        .patch(`/subcategories/${testSubcategory.id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ name: 'Test Subcategory Updated' })
        .expect(200);

      const body = response.body as SubcategoryResponseDto;
      expect(body.name).toBe('Test Subcategory Updated');

      // Restaure le nom original
      await dataSource.getRepository(Subcategory).update(testSubcategory.id, { name: testSubcategory.name });
    });

    it('devrait mettre à jour le slug avec succès', async () => {
      const response = await request(app.getHttpServer())
        .patch(`/subcategories/${testSubcategory.id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ slug: 'test-subcategory-e2e-updated' })
        .expect(200);

      const body = response.body as SubcategoryResponseDto;
      expect(body.slug).toBe('test-subcategory-e2e-updated');

      // Restaure le slug original
      await dataSource.getRepository(Subcategory).update(testSubcategory.id, { slug: testSubcategory.slug });
    });

    it('devrait mettre à jour la position avec succès', async () => {
      const response = await request(app.getHttpServer())
        .patch(`/subcategories/${testSubcategory.id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ position: 99 })
        .expect(200);

      const body = response.body as SubcategoryResponseDto;
      expect(body.position).toBe(99);

      // Restaure la position originale
      await dataSource.getRepository(Subcategory).update(testSubcategory.id, { position: testSubcategory.position });
    });

    it('devrait refuser la mise à jour sans authentification', () => {
      return request(app.getHttpServer())
        .patch(`/subcategories/${testSubcategory.id}`)
        .send({ name: 'Test' })
        .expect(401);
    });

    it('devrait refuser la mise à jour pour un utilisateur non-admin', () => {
      return request(app.getHttpServer())
        .patch(`/subcategories/${testSubcategory.id}`)
        .set('Authorization', `Bearer ${userToken}`)
        .send({ name: 'Test' })
        .expect(403);
    });

    it('devrait retourner 404 pour une sous-catégorie inexistante', () => {
      return request(app.getHttpServer())
        .patch('/subcategories/00000000-0000-0000-0000-000000000000')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ name: 'Test' })
        .expect(404);
    });

    it('devrait retourner 409 si le nouveau slug existe déjà', async () => {
      // Crée une autre sous-catégorie
      const subcategoryRepository = dataSource.getRepository(Subcategory);
      const otherSubcategory = subcategoryRepository.create({
        name: 'Test Autre Sub Conflit',
        slug: 'test-autre-sub-conflit',
        position: 0,
        categoryId: testCategory.id,
        createdBy: adminUser.id,
      });
      await subcategoryRepository.save(otherSubcategory);

      await request(app.getHttpServer())
        .patch(`/subcategories/${testSubcategory.id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ slug: 'test-autre-sub-conflit' })
        .expect(409);

      // Nettoie
      await subcategoryRepository.delete(otherSubcategory.id);
    });

    it('devrait permettre de garder le même nom sans conflit', () => {
      return request(app.getHttpServer())
        .patch(`/subcategories/${testSubcategory.id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ name: testSubcategory.name })
        .expect(200);
    });
  });

  // ========================================
  // Tests DELETE /subcategories/:id
  // ========================================
  describe('DELETE /subcategories/:id', () => {
    it('devrait supprimer une sous-catégorie avec succès', async () => {
      // Crée une sous-catégorie à supprimer
      const subcategoryRepository = dataSource.getRepository(Subcategory);
      const subcategoryToDelete = subcategoryRepository.create({
        name: 'Test Sous-Catégorie À Supprimer',
        slug: 'test-sous-categorie-a-supprimer',
        position: 0,
        categoryId: testCategory.id,
        createdBy: adminUser.id,
      });
      await subcategoryRepository.save(subcategoryToDelete);

      await request(app.getHttpServer())
        .delete(`/subcategories/${subcategoryToDelete.id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(204);

      // Vérifie que la sous-catégorie a été supprimée
      const deletedSubcategory = await subcategoryRepository.findOne({ where: { id: subcategoryToDelete.id } });
      expect(deletedSubcategory).toBeNull();
    });

    it('devrait refuser la suppression sans authentification', () => {
      return request(app.getHttpServer()).delete(`/subcategories/${testSubcategory.id}`).expect(401);
    });

    it('devrait refuser la suppression pour un utilisateur non-admin', () => {
      return request(app.getHttpServer())
        .delete(`/subcategories/${testSubcategory.id}`)
        .set('Authorization', `Bearer ${userToken}`)
        .expect(403);
    });

    it('devrait retourner 404 pour une sous-catégorie inexistante', () => {
      return request(app.getHttpServer())
        .delete('/subcategories/00000000-0000-0000-0000-000000000000')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(404);
    });
  });
});
