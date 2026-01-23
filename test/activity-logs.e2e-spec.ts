// test/activity-logs.e2e-spec.ts
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { DataSource } from 'typeorm';
import { Role } from '../src/modules/roles/entities/role.entity';
import { User, UserStatus, AuthProvider } from '../src/modules/users/entities/user.entity';
import { ActivityLog, ActorType, ActionType, EntityType, LogSeverity } from '../src/modules/activity-logs';
import * as bcrypt from 'bcrypt';

// Types pour les réponses API
interface AuthResponse {
  accessToken: string;
  user: {
    id: string;
    email: string;
  };
}

interface PaginatedLogsResponse {
  data: ActivityLog[];
  meta: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNextPage: boolean;
    hasPreviousPage: boolean;
  };
}

interface FiltersResponse {
  actorTypes: string[];
  actionTypes: string[];
  entityTypes: string[];
  severities: string[];
}

describe('Activity Logs (e2e)', () => {
  let app: INestApplication;
  let dataSource: DataSource;
  let adminToken: string;
  let userToken: string;
  let adminUser: User;
  let normalUser: User;
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

    // Crée un utilisateur ADMIN pour les tests
    const userRepository = dataSource.getRepository(User);
    const passwordHash = await bcrypt.hash('password123', 10);

    adminUser = userRepository.create({
      email: 'admin-logs@test.com',
      passwordHash,
      role: adminRole,
      roleId: adminRole.id,
      status: UserStatus.ACTIVE,
      authProvider: AuthProvider.LOCAL,
    });
    await userRepository.save(adminUser);

    // Crée un utilisateur normal pour les tests
    normalUser = userRepository.create({
      email: 'user-logs@test.com',
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
      .send({ email: 'admin-logs@test.com', password: 'password123' });
    adminToken = (adminLoginResponse.body as AuthResponse).accessToken;

    const userLoginResponse = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: 'user-logs@test.com', password: 'password123' });
    userToken = (userLoginResponse.body as AuthResponse).accessToken;
  });

  afterAll(async () => {
    // Nettoie les données de test
    await dataSource.query('DELETE FROM activity_logs');
    await dataSource.query(`DELETE FROM users WHERE email IN ('admin-logs@test.com', 'user-logs@test.com')`);
    await dataSource.destroy();
    await app.close();
  });

  // ========================================
  // Tests GET /activity-logs
  // ========================================
  describe('GET /activity-logs', () => {
    it('devrait retourner les logs avec pagination pour un ADMIN', () => {
      return request(app.getHttpServer())
        .get('/activity-logs')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200)
        .expect((res) => {
          const body = res.body as PaginatedLogsResponse;
          expect(body).toHaveProperty('data');
          expect(body).toHaveProperty('meta');
          expect(Array.isArray(body.data)).toBe(true);
          expect(body.meta).toHaveProperty('page');
          expect(body.meta).toHaveProperty('limit');
          expect(body.meta).toHaveProperty('total');
        });
    });

    it("devrait refuser l'accès à un utilisateur non-admin", () => {
      return request(app.getHttpServer()).get('/activity-logs').set('Authorization', `Bearer ${userToken}`).expect(403);
    });

    it("devrait refuser l'accès sans authentification", () => {
      return request(app.getHttpServer()).get('/activity-logs').expect(401);
    });

    it('devrait filtrer par actionType', () => {
      return request(app.getHttpServer())
        .get('/activity-logs')
        .query({ actionType: ActionType.USER_LOGIN })
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200)
        .expect((res) => {
          const body = res.body as PaginatedLogsResponse;
          body.data.forEach((log) => {
            expect(log.actionType).toBe(ActionType.USER_LOGIN);
          });
        });
    });

    it('devrait filtrer par severity', () => {
      return request(app.getHttpServer())
        .get('/activity-logs')
        .query({ severity: LogSeverity.WARNING })
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200)
        .expect((res) => {
          const body = res.body as PaginatedLogsResponse;
          body.data.forEach((log) => {
            expect(log.severity).toBe(LogSeverity.WARNING);
          });
        });
    });

    it('devrait filtrer par actorType', () => {
      return request(app.getHttpServer())
        .get('/activity-logs')
        .query({ actorType: ActorType.USER })
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200)
        .expect((res) => {
          const body = res.body as PaginatedLogsResponse;
          body.data.forEach((log) => {
            expect(log.actorType).toBe(ActorType.USER);
          });
        });
    });

    it('devrait respecter la pagination', () => {
      return request(app.getHttpServer())
        .get('/activity-logs')
        .query({ page: 1, limit: 5 })
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200)
        .expect((res) => {
          const body = res.body as PaginatedLogsResponse;
          expect(body.meta.page).toBe(1);
          expect(body.meta.limit).toBe(5);
          expect(body.data.length).toBeLessThanOrEqual(5);
        });
    });

    it('devrait rejeter une page invalide', () => {
      return request(app.getHttpServer())
        .get('/activity-logs')
        .query({ page: 0 })
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(400);
    });

    it('devrait rejeter une limite trop élevée', () => {
      return request(app.getHttpServer())
        .get('/activity-logs')
        .query({ limit: 200 })
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(400);
    });
  });

  // ========================================
  // Tests GET /activity-logs/filters
  // ========================================
  describe('GET /activity-logs/filters', () => {
    it('devrait retourner les valeurs des filtres disponibles', () => {
      return request(app.getHttpServer())
        .get('/activity-logs/filters')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200)
        .expect((res) => {
          const body = res.body as FiltersResponse;
          expect(body).toHaveProperty('actorTypes');
          expect(body).toHaveProperty('actionTypes');
          expect(body).toHaveProperty('entityTypes');
          expect(body).toHaveProperty('severities');
          expect(Array.isArray(body.actorTypes)).toBe(true);
          expect(Array.isArray(body.actionTypes)).toBe(true);
          expect(body.actorTypes).toContain(ActorType.USER);
          expect(body.severities).toContain(LogSeverity.INFO);
        });
    });

    it("devrait refuser l'accès à un utilisateur non-admin", () => {
      return request(app.getHttpServer())
        .get('/activity-logs/filters')
        .set('Authorization', `Bearer ${userToken}`)
        .expect(403);
    });
  });

  // ========================================
  // Tests GET /activity-logs/user/:userId
  // ========================================
  describe('GET /activity-logs/user/:userId', () => {
    it("devrait retourner les logs d'un utilisateur spécifique", () => {
      return request(app.getHttpServer())
        .get(`/activity-logs/user/${adminUser.id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200)
        .expect((res) => {
          const body = res.body as ActivityLog[];
          expect(Array.isArray(body)).toBe(true);
        });
    });

    it('devrait rejeter un UUID invalide', () => {
      return request(app.getHttpServer())
        .get('/activity-logs/user/invalid-uuid')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(400);
    });

    it("devrait refuser l'accès à un utilisateur non-admin", () => {
      return request(app.getHttpServer())
        .get(`/activity-logs/user/${adminUser.id}`)
        .set('Authorization', `Bearer ${userToken}`)
        .expect(403);
    });
  });

  // ========================================
  // Tests GET /activity-logs/entity/:entityType/:entityId
  // ========================================
  describe('GET /activity-logs/entity/:entityType/:entityId', () => {
    it("devrait retourner les logs d'une entité spécifique", () => {
      return request(app.getHttpServer())
        .get(`/activity-logs/entity/${EntityType.USER}/${adminUser.id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200)
        .expect((res) => {
          const body = res.body as ActivityLog[];
          expect(Array.isArray(body)).toBe(true);
        });
    });

    it('devrait rejeter un entityId UUID invalide', () => {
      return request(app.getHttpServer())
        .get(`/activity-logs/entity/${EntityType.USER}/invalid-uuid`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(400);
    });
  });
});
