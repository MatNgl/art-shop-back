import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { DataSource } from 'typeorm';
import { Role } from '../src/modules/roles/entities/role.entity';
import { User, UserStatus, AuthProvider } from '../src/modules/users/entities/user.entity';
import * as bcrypt from 'bcrypt';

// Types pour les réponses API
interface AuthResponse {
  accessToken: string;
  user: {
    id: string;
    email: string;
  };
}

interface UserDto {
  id: string;
  email: string;
  firstName?: string;
  lastName?: string;
  status: UserStatus;
  role: {
    id: string;
    code: string;
    label: string;
  };
}

interface PaginatedUsersResponse {
  data: UserDto[];
  meta: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNextPage: boolean;
    hasPreviousPage: boolean;
  };
}

interface StatsResponse {
  total: number;
  active: number;
  inactive: number;
  suspended: number;
  byRole: Record<string, number>;
  byAuthProvider: Record<string, number>;
}

interface ErrorResponse {
  message: string | string[];
  error?: string;
  statusCode: number;
}

describe('Users (e2e)', () => {
  let app: INestApplication;
  let dataSource: DataSource;
  let superAdminToken: string;
  let adminToken: string;
  let userToken: string;
  let superAdminUser: User;
  let adminUser: User;
  let normalUser: User;
  let testUser: User;
  let superAdminRole: Role;
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
    superAdminRole = (await roleRepository.findOne({ where: { code: 'SUPER_ADMIN' } })) as Role;
    adminRole = (await roleRepository.findOne({ where: { code: 'ADMIN' } })) as Role;
    userRole = (await roleRepository.findOne({ where: { code: 'USER' } })) as Role;

    // Crée les utilisateurs de test
    const userRepository = dataSource.getRepository(User);
    const passwordHash = await bcrypt.hash('password123', 10);

    superAdminUser = userRepository.create({
      email: 'superadmin-users@test.com',
      passwordHash,
      role: superAdminRole,
      roleId: superAdminRole.id,
      status: UserStatus.ACTIVE,
      authProvider: AuthProvider.LOCAL,
    });
    await userRepository.save(superAdminUser);

    adminUser = userRepository.create({
      email: 'admin-users@test.com',
      passwordHash,
      role: adminRole,
      roleId: adminRole.id,
      status: UserStatus.ACTIVE,
      authProvider: AuthProvider.LOCAL,
    });
    await userRepository.save(adminUser);

    normalUser = userRepository.create({
      email: 'user-users@test.com',
      passwordHash,
      role: userRole,
      roleId: userRole.id,
      status: UserStatus.ACTIVE,
      authProvider: AuthProvider.LOCAL,
    });
    await userRepository.save(normalUser);

    // Utilisateur pour les tests de modification/suppression
    testUser = userRepository.create({
      email: 'test-target@test.com',
      passwordHash,
      firstName: 'Test',
      lastName: 'User',
      role: userRole,
      roleId: userRole.id,
      status: UserStatus.ACTIVE,
      authProvider: AuthProvider.LOCAL,
    });
    await userRepository.save(testUser);

    // Récupère les tokens
    const superAdminLoginResponse = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: 'superadmin-users@test.com', password: 'password123' });
    superAdminToken = (superAdminLoginResponse.body as AuthResponse).accessToken;

    const adminLoginResponse = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: 'admin-users@test.com', password: 'password123' });
    adminToken = (adminLoginResponse.body as AuthResponse).accessToken;

    const userLoginResponse = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: 'user-users@test.com', password: 'password123' });
    userToken = (userLoginResponse.body as AuthResponse).accessToken;
  });

  afterAll(async () => {
    // Nettoie les données de test
    await dataSource.query('DELETE FROM activity_logs');
    await dataSource.query(
      `DELETE FROM users WHERE email IN ('superadmin-users@test.com', 'admin-users@test.com', 'user-users@test.com', 'test-target@test.com', 'updated@test.com', 'newuser@test.com')`,
    );
    await dataSource.destroy();
    await app.close();
  });

  // Recrée testUser avant chaque test pour éviter les effets de bord
  beforeEach(async () => {
    const userRepository = dataSource.getRepository(User);
    const existingTestUser = await userRepository.findOne({ where: { email: 'test-target@test.com' } });

    if (!existingTestUser) {
      const passwordHash = await bcrypt.hash('password123', 10);
      testUser = userRepository.create({
        email: 'test-target@test.com',
        passwordHash,
        firstName: 'Test',
        lastName: 'User',
        role: userRole,
        roleId: userRole.id,
        status: UserStatus.ACTIVE,
        authProvider: AuthProvider.LOCAL,
      });
      await userRepository.save(testUser);
    } else {
      testUser = existingTestUser;
    }
  });

  // ========================================
  // Tests GET /users
  // ========================================
  describe('GET /users', () => {
    it('devrait retourner la liste des utilisateurs pour un ADMIN', () => {
      return request(app.getHttpServer())
        .get('/users')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200)
        .expect((res) => {
          const body = res.body as PaginatedUsersResponse;
          expect(body).toHaveProperty('data');
          expect(body).toHaveProperty('meta');
          expect(Array.isArray(body.data)).toBe(true);
          expect(body.data[0]).toHaveProperty('email');
          expect(body.data[0]).toHaveProperty('role');
          expect(body.data[0]).not.toHaveProperty('passwordHash');
        });
    });

    it('devrait retourner la liste des utilisateurs pour un SUPER_ADMIN', () => {
      return request(app.getHttpServer()).get('/users').set('Authorization', `Bearer ${superAdminToken}`).expect(200);
    });

    it("devrait refuser l'accès à un utilisateur normal", () => {
      return request(app.getHttpServer()).get('/users').set('Authorization', `Bearer ${userToken}`).expect(403);
    });

    it("devrait refuser l'accès sans authentification", () => {
      return request(app.getHttpServer()).get('/users').expect(401);
    });

    it('devrait filtrer par recherche', () => {
      return request(app.getHttpServer())
        .get('/users')
        .query({ search: 'admin' })
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200)
        .expect((res) => {
          const body = res.body as PaginatedUsersResponse;
          body.data.forEach((user) => {
            const matchesSearch =
              user.email.toLowerCase().includes('admin') ||
              user.firstName?.toLowerCase().includes('admin') ||
              user.lastName?.toLowerCase().includes('admin');
            expect(matchesSearch).toBe(true);
          });
        });
    });

    it('devrait filtrer par statut', () => {
      return request(app.getHttpServer())
        .get('/users')
        .query({ status: UserStatus.ACTIVE })
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200)
        .expect((res) => {
          const body = res.body as PaginatedUsersResponse;
          body.data.forEach((user) => {
            expect(user.status).toBe(UserStatus.ACTIVE);
          });
        });
    });

    it('devrait filtrer par code de rôle', () => {
      return request(app.getHttpServer())
        .get('/users')
        .query({ roleCode: 'ADMIN' })
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200)
        .expect((res) => {
          const body = res.body as PaginatedUsersResponse;
          body.data.forEach((user) => {
            expect(user.role.code).toBe('ADMIN');
          });
        });
    });

    it('devrait respecter la pagination', () => {
      return request(app.getHttpServer())
        .get('/users')
        .query({ page: 1, limit: 2 })
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200)
        .expect((res) => {
          const body = res.body as PaginatedUsersResponse;
          expect(body.meta.page).toBe(1);
          expect(body.meta.limit).toBe(2);
          expect(body.data.length).toBeLessThanOrEqual(2);
        });
    });

    it('devrait trier par email', () => {
      return request(app.getHttpServer())
        .get('/users')
        .query({ sortBy: 'email', sortOrder: 'ASC' })
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);
    });
  });

  // ========================================
  // Tests GET /users/stats
  // ========================================
  describe('GET /users/stats', () => {
    it('devrait retourner les statistiques des utilisateurs', () => {
      return request(app.getHttpServer())
        .get('/users/stats')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200)
        .expect((res) => {
          const body = res.body as StatsResponse;
          expect(body).toHaveProperty('total');
          expect(body).toHaveProperty('active');
          expect(body).toHaveProperty('inactive');
          expect(body).toHaveProperty('suspended');
          expect(body).toHaveProperty('byRole');
          expect(body).toHaveProperty('byAuthProvider');
          expect(typeof body.total).toBe('number');
        });
    });

    it("devrait refuser l'accès à un utilisateur normal", () => {
      return request(app.getHttpServer()).get('/users/stats').set('Authorization', `Bearer ${userToken}`).expect(403);
    });
  });

  // ========================================
  // Tests GET /users/roles
  // ========================================
  describe('GET /users/roles', () => {
    it('devrait retourner la liste des rôles disponibles', () => {
      return request(app.getHttpServer())
        .get('/users/roles')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200)
        .expect((res) => {
          const body = res.body as Role[];
          expect(Array.isArray(body)).toBe(true);
          expect(body.length).toBeGreaterThan(0);
          expect(body[0]).toHaveProperty('id');
          expect(body[0]).toHaveProperty('code');
          expect(body[0]).toHaveProperty('label');
        });
    });
  });

  // ========================================
  // Tests GET /users/:id
  // ========================================
  describe('GET /users/:id', () => {
    it("devrait retourner les détails d'un utilisateur", () => {
      return request(app.getHttpServer())
        .get(`/users/${testUser.id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200)
        .expect((res) => {
          const body = res.body as UserDto;
          expect(body.id).toBe(testUser.id);
          expect(body.email).toBe(testUser.email);
          expect(body).toHaveProperty('role');
          expect(body).not.toHaveProperty('passwordHash');
        });
    });

    it('devrait retourner 404 pour un utilisateur inexistant', () => {
      return request(app.getHttpServer())
        .get('/users/00000000-0000-0000-0000-000000000000')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(404);
    });

    it('devrait rejeter un UUID invalide', () => {
      return request(app.getHttpServer())
        .get('/users/invalid-uuid')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(400);
    });
  });

  // ========================================
  // Tests PATCH /users/:id
  // ========================================
  describe('PATCH /users/:id', () => {
    it('devrait mettre à jour un utilisateur avec succès', () => {
      return request(app.getHttpServer())
        .patch(`/users/${testUser.id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ firstName: 'Updated', lastName: 'Name' })
        .expect(200)
        .expect((res) => {
          const body = res.body as UserDto;
          expect(body.firstName).toBe('Updated');
          expect(body.lastName).toBe('Name');
        });
    });

    it('devrait refuser à un ADMIN de modifier un SUPER_ADMIN', () => {
      return request(app.getHttpServer())
        .patch(`/users/${superAdminUser.id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ firstName: 'Hacked' })
        .expect(403);
    });

    it('devrait permettre à un SUPER_ADMIN de modifier un autre SUPER_ADMIN', async () => {
      // Crée un second SUPER_ADMIN pour ce test
      const userRepository = dataSource.getRepository(User);
      const passwordHash = await bcrypt.hash('password123', 10);
      const secondSuperAdmin = userRepository.create({
        email: 'second-superadmin@test.com',
        passwordHash,
        role: superAdminRole,
        roleId: superAdminRole.id,
        status: UserStatus.ACTIVE,
        authProvider: AuthProvider.LOCAL,
      });
      await userRepository.save(secondSuperAdmin);

      await request(app.getHttpServer())
        .patch(`/users/${secondSuperAdmin.id}`)
        .set('Authorization', `Bearer ${superAdminToken}`)
        .send({ firstName: 'Modified' })
        .expect(200);

      // Nettoie
      await userRepository.remove(secondSuperAdmin);
    });

    it('devrait rejeter un email déjà utilisé', () => {
      return request(app.getHttpServer())
        .patch(`/users/${testUser.id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ email: adminUser.email })
        .expect(409);
    });

    it('devrait rejeter un email invalide', () => {
      return request(app.getHttpServer())
        .patch(`/users/${testUser.id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ email: 'invalid-email' })
        .expect(400);
    });

    it("devrait refuser à un ADMIN d'attribuer le rôle SUPER_ADMIN", () => {
      return request(app.getHttpServer())
        .patch(`/users/${testUser.id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ roleId: superAdminRole.id })
        .expect(403);
    });

    it("devrait permettre à un SUPER_ADMIN d'attribuer le rôle SUPER_ADMIN", () => {
      return request(app.getHttpServer())
        .patch(`/users/${testUser.id}`)
        .set('Authorization', `Bearer ${superAdminToken}`)
        .send({ roleId: adminRole.id })
        .expect(200);
    });
  });

  // ========================================
  // Tests PATCH /users/:id/status
  // ========================================
  describe('PATCH /users/:id/status', () => {
    it("devrait changer le statut d'un utilisateur", () => {
      return request(app.getHttpServer())
        .patch(`/users/${testUser.id}/status`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ status: UserStatus.SUSPENDED, reason: 'Test de suspension' })
        .expect(200)
        .expect((res) => {
          const body = res.body as UserDto;
          expect(body.status).toBe(UserStatus.SUSPENDED);
        });
    });

    it('devrait refuser de modifier son propre statut', () => {
      return request(app.getHttpServer())
        .patch(`/users/${adminUser.id}/status`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ status: UserStatus.SUSPENDED })
        .expect(400);
    });

    it("devrait refuser à un ADMIN de modifier le statut d'un SUPER_ADMIN", () => {
      return request(app.getHttpServer())
        .patch(`/users/${superAdminUser.id}/status`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ status: UserStatus.SUSPENDED })
        .expect(403);
    });

    it('devrait rejeter un statut invalide', () => {
      return request(app.getHttpServer())
        .patch(`/users/${testUser.id}/status`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ status: 'INVALID_STATUS' })
        .expect(400);
    });

    it('devrait réactiver un utilisateur suspendu', async () => {
      // D'abord suspendre
      await request(app.getHttpServer())
        .patch(`/users/${testUser.id}/status`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ status: UserStatus.SUSPENDED })
        .expect(200);

      // Puis réactiver
      return request(app.getHttpServer())
        .patch(`/users/${testUser.id}/status`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ status: UserStatus.ACTIVE, reason: 'Réactivation' })
        .expect(200)
        .expect((res) => {
          const body = res.body as UserDto;
          expect(body.status).toBe(UserStatus.ACTIVE);
        });
    });
  });

  // ========================================
  // Tests DELETE /users/:id
  // ========================================
  describe('DELETE /users/:id', () => {
    it('devrait supprimer un utilisateur avec succès', async () => {
      // Crée un utilisateur à supprimer
      const userRepository = dataSource.getRepository(User);
      const passwordHash = await bcrypt.hash('password123', 10);
      const userToDelete = userRepository.create({
        email: 'to-delete@test.com',
        passwordHash,
        role: userRole,
        roleId: userRole.id,
        status: UserStatus.ACTIVE,
        authProvider: AuthProvider.LOCAL,
      });
      await userRepository.save(userToDelete);

      await request(app.getHttpServer())
        .delete(`/users/${userToDelete.id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(204);

      // Vérifie que l'utilisateur n'existe plus
      const deletedUser = await userRepository.findOne({ where: { id: userToDelete.id } });
      expect(deletedUser).toBeNull();
    });

    it('devrait refuser de supprimer son propre compte', () => {
      return request(app.getHttpServer())
        .delete(`/users/${adminUser.id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(400)
        .expect((res) => {
          const body = res.body as ErrorResponse;
          const message = typeof body.message === 'string' ? body.message : body.message.join(' ');
          expect(message).toContain('propre compte');
        });
    });

    it('devrait refuser à un ADMIN de supprimer un SUPER_ADMIN', () => {
      return request(app.getHttpServer())
        .delete(`/users/${superAdminUser.id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(403);
    });

    it("devrait permettre de supprimer un SUPER_ADMIN s'il en reste d'autres", async () => {
      const userRepository = dataSource.getRepository(User);
      const passwordHash = await bcrypt.hash('password123', 10);

      // Crée un second SUPER_ADMIN à supprimer
      const superAdminToDelete = userRepository.create({
        email: 'superadmin-to-delete@test.com',
        passwordHash,
        role: superAdminRole,
        roleId: superAdminRole.id,
        status: UserStatus.ACTIVE,
        authProvider: AuthProvider.LOCAL,
      });
      await userRepository.save(superAdminToDelete);

      // Supprime avec le token du premier SUPER_ADMIN
      await request(app.getHttpServer())
        .delete(`/users/${superAdminToDelete.id}`)
        .set('Authorization', `Bearer ${superAdminToken}`)
        .expect(204);

      // Vérifie la suppression
      const deleted = await userRepository.findOne({ where: { id: superAdminToDelete.id } });
      expect(deleted).toBeNull();
    });

    it('devrait retourner 404 pour un utilisateur inexistant', () => {
      return request(app.getHttpServer())
        .delete('/users/00000000-0000-0000-0000-000000000000')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(404);
    });
  });
});
