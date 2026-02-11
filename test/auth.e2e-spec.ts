import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { DataSource } from 'typeorm';

// Types pour les réponses API
interface AuthResponse {
  accessToken: string;
  user: {
    id: string;
    email: string;
    role: {
      id: string;
      code: string;
      label: string;
    };
  };
}

interface ErrorResponse {
  message: string | string[];
  error?: string;
  statusCode: number;
}

interface UserProfileResponse {
  id: string;
  email: string;
  role: {
    id: string;
    code: string;
    label: string;
  };
}

interface LogoutResponse {
  message: string;
}

describe('Auth (e2e)', () => {
  let app: INestApplication;
  let dataSource: DataSource;

  // Configuration AVANT tous les tests
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

    // 🛡️ SÉCURITÉ : Nettoyage préventif au démarrage
    // Si le test précédent a crashé violemment, on s'assure que la BDD est propre
    await cleanDatabase(dataSource);
  });

  // Nettoie la BDD APRÈS chaque test
  afterEach(async () => {
    await cleanDatabase(dataSource);
  });

  // Ferme l'application APRÈS tous les tests
  afterAll(async () => {
    if (dataSource && dataSource.isInitialized) {
      await dataSource.destroy();
    }
    await app.close();
  });

  // 🧹 FONCTION DE NETTOYAGE ROBUSTE
  const cleanDatabase = async (ds: DataSource) => {
    if (!ds.isInitialized) return;

    try {
      // LISTE DE TOUTES LES TABLES DE CONTENU (qui peuvent référencer un user)
      // L'ordre n'a pas d'importance ici grâce au CASCADE
      const tablesToClean = [
        // Images
        'product_variant_images',
        'product_images',
        // Variants
        'product_variants',
        // Products (relations N-N)
        'product_categories',
        'product_subcategories',
        // Categories
        'subcategories',
        'categories',
        // Products
        'products',
        // Catalog
        'formats',
        'materials',
        'tags',
        // Logs
        'activity_logs',
      ];

      // TRUNCATE est beaucoup plus rapide que DELETE et CASCADE gère les dépendances
      await ds.query(`TRUNCATE TABLE ${tablesToClean.join(', ')} CASCADE`);

      // Ensuite, on supprime les utilisateurs de test
      await ds.query("DELETE FROM users WHERE email LIKE '%@example.com'");
    } catch (error) {
      console.error('ERREUR CRITIQUE NETTOYAGE BDD:', error);
      throw error;
    }
  };

  // ========================================
  // Tests POST /auth/register
  // ========================================
  describe('POST /auth/register', () => {
    const validRegisterData = {
      email: 'test@example.com',
      password: 'password123',
      confirmPassword: 'password123',
    };

    it('devrait créer un nouvel utilisateur avec succès', () => {
      return request(app.getHttpServer())
        .post('/auth/register')
        .send(validRegisterData)
        .expect(201)
        .expect((res) => {
          const body = res.body as AuthResponse;
          expect(body).toHaveProperty('accessToken');
          expect(body).toHaveProperty('user');
          expect(body.user).toHaveProperty('email', validRegisterData.email);
          expect(body.user).not.toHaveProperty('passwordHash');
        });
    });

    it('devrait rejeter un email invalide', () => {
      return request(app.getHttpServer())
        .post('/auth/register')
        .send({
          email: 'invalid-email',
          password: 'password123',
          confirmPassword: 'password123',
        })
        .expect(400)
        .expect((res) => {
          const body = res.body as ErrorResponse;
          const messages = Array.isArray(body.message) ? body.message : [body.message];
          expect(messages).toEqual(expect.arrayContaining([expect.stringContaining('email')]));
        });
    });

    it('devrait rejeter un mot de passe trop court', () => {
      return request(app.getHttpServer())
        .post('/auth/register')
        .send({
          email: 'test@example.com',
          password: '123',
          confirmPassword: '123',
        })
        .expect(400)
        .expect((res) => {
          const body = res.body as ErrorResponse;
          const messages = Array.isArray(body.message) ? body.message : [body.message];
          expect(messages).toEqual(expect.arrayContaining([expect.stringContaining('8 caractères')]));
        });
    });

    it('devrait rejeter des mots de passe différents', () => {
      return request(app.getHttpServer())
        .post('/auth/register')
        .send({
          email: 'test@example.com',
          password: 'password123',
          confirmPassword: 'password456',
        })
        .expect(400)
        .expect((res) => {
          const body = res.body as ErrorResponse;
          const messages = Array.isArray(body.message) ? body.message : [body.message];
          expect(messages).toEqual(expect.arrayContaining([expect.stringContaining('correspondent pas')]));
        });
    });

    it('devrait rejeter un email déjà utilisé', async () => {
      await request(app.getHttpServer()).post('/auth/register').send(validRegisterData).expect(201);

      return request(app.getHttpServer())
        .post('/auth/register')
        .send(validRegisterData)
        .expect(409)
        .expect((res) => {
          const body = res.body as ErrorResponse;
          const message = typeof body.message === 'string' ? body.message : body.message.join(' ');
          expect(message).toContain('déjà utilisé');
        });
    });

    it('devrait rejeter un mot de passe trop long', () => {
      return request(app.getHttpServer())
        .post('/auth/register')
        .send({
          email: 'test@example.com',
          password: 'a'.repeat(51),
          confirmPassword: 'a'.repeat(51),
        })
        .expect(400)
        .expect((res) => {
          const body = res.body as ErrorResponse;
          const messages = Array.isArray(body.message) ? body.message : [body.message];
          expect(messages).toEqual(expect.arrayContaining([expect.stringContaining('50 caractères')]));
        });
    });

    it('devrait rejeter des propriétés non autorisées', () => {
      return request(app.getHttpServer())
        .post('/auth/register')
        .send({
          ...validRegisterData,
          isAdmin: true,
        })
        .expect(400);
    });
  });

  // ========================================
  // Tests POST /auth/login
  // ========================================
  describe('POST /auth/login', () => {
    const registerData = {
      email: 'logintest@example.com',
      password: 'password123',
      confirmPassword: 'password123',
    };

    beforeEach(async () => {
      // On s'assure que l'utilisateur n'existe pas avant de le créer (double sécurité)
      await cleanDatabase(dataSource);
      await request(app.getHttpServer()).post('/auth/register').send(registerData).expect(201);
    });

    it('devrait connecter un utilisateur avec des identifiants valides', () => {
      return request(app.getHttpServer())
        .post('/auth/login')
        .send({
          email: registerData.email,
          password: registerData.password,
        })
        .expect(200)
        .expect((res) => {
          const body = res.body as AuthResponse;
          expect(body).toHaveProperty('accessToken');
          expect(body).toHaveProperty('user');
          expect(body.user.email).toBe(registerData.email);
        });
    });

    it('devrait rejeter un email inexistant', () => {
      return request(app.getHttpServer())
        .post('/auth/login')
        .send({
          email: 'inexistant@example.com',
          password: 'password123',
        })
        .expect(401)
        .expect((res) => {
          const body = res.body as ErrorResponse;
          const message = typeof body.message === 'string' ? body.message : body.message.join(' ');
          expect(message).toContain('Email ou mot de passe incorrect');
        });
    });

    it('devrait rejeter un mot de passe incorrect', () => {
      return request(app.getHttpServer())
        .post('/auth/login')
        .send({
          email: registerData.email,
          password: 'wrongpassword',
        })
        .expect(401)
        .expect((res) => {
          const body = res.body as ErrorResponse;
          const message = typeof body.message === 'string' ? body.message : body.message.join(' ');
          expect(message).toContain('Email ou mot de passe incorrect');
        });
    });

    it('devrait rejeter un email invalide', () => {
      return request(app.getHttpServer())
        .post('/auth/login')
        .send({
          email: 'invalid-email',
          password: 'password123',
        })
        .expect(400);
    });

    it('devrait rejeter un mot de passe vide', () => {
      return request(app.getHttpServer())
        .post('/auth/login')
        .send({
          email: registerData.email,
          password: '',
        })
        .expect(400);
    });
  });

  // ========================================
  // Tests GET /auth/me
  // ========================================
  describe('GET /auth/me', () => {
    let accessToken: string;
    const registerData = {
      email: 'profiletest@example.com',
      password: 'password123',
      confirmPassword: 'password123',
    };

    beforeEach(async () => {
      await cleanDatabase(dataSource);
      const response = await request(app.getHttpServer()).post('/auth/register').send(registerData).expect(201);
      const body = response.body as AuthResponse;
      accessToken = body.accessToken;
    });

    it('devrait retourner le profil utilisateur avec un token valide', () => {
      return request(app.getHttpServer())
        .get('/auth/me')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200)
        .expect((res) => {
          const body = res.body as UserProfileResponse;
          expect(body).toHaveProperty('email', registerData.email);
          expect(body).toHaveProperty('role');
          expect(body).not.toHaveProperty('passwordHash');
        });
    });

    it('devrait rejeter une requête sans token', () => {
      return request(app.getHttpServer()).get('/auth/me').expect(401);
    });

    it('devrait rejeter un token invalide', () => {
      return request(app.getHttpServer()).get('/auth/me').set('Authorization', 'Bearer invalid-token-123').expect(401);
    });

    it('devrait rejeter un token mal formaté', () => {
      return request(app.getHttpServer()).get('/auth/me').set('Authorization', accessToken).expect(401);
    });
  });

  // ========================================
  // Tests POST /auth/logout
  // ========================================
  describe('POST /auth/logout', () => {
    let accessToken: string;
    const registerData = {
      email: 'logouttest@example.com',
      password: 'password123',
      confirmPassword: 'password123',
    };

    beforeEach(async () => {
      await cleanDatabase(dataSource);
      const response = await request(app.getHttpServer()).post('/auth/register').send(registerData).expect(201);
      const body = response.body as AuthResponse;
      accessToken = body.accessToken;
    });

    it('devrait déconnecter un utilisateur avec un token valide', () => {
      return request(app.getHttpServer())
        .post('/auth/logout')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200)
        .expect((res) => {
          const body = res.body as LogoutResponse;
          expect(body).toHaveProperty('message');
        });
    });

    it('devrait rejeter une déconnexion sans token', () => {
      return request(app.getHttpServer()).post('/auth/logout').expect(401);
    });
  });
});
