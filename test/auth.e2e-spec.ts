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
    // Crée un module de test complet avec tout AppModule
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule], // Importe toute l'application
    }).compile();

    app = moduleFixture.createNestApplication();

    // ✅ IMPORTANT : Active le ValidationPipe pour tester les validations des DTOs
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );

    await app.init();

    // Récupère la connexion à la base de données pour pouvoir nettoyer entre les tests
    dataSource = moduleFixture.get<DataSource>(DataSource);
  });

  // Nettoie la BDD APRÈS chaque test pour garantir l'isolation
  afterEach(async () => {
    await dataSource.query('DELETE FROM activity_logs'); // Supprime les logs d'activité
    // Supprime tous les utilisateurs créés pendant le test
    await dataSource.query("DELETE FROM users  WHERE email LIKE '%@example.com'");
  });

  // Ferme l'application APRÈS tous les tests
  afterAll(async () => {
    await dataSource.destroy(); // ✅ Ferme proprement la connexion BDD
    await app.close();
  });

  // ========================================
  // Tests POST /auth/register
  // ========================================
  describe('POST /auth/register', () => {
    const validRegisterData = {
      email: 'test@example.com',
      password: 'password123',
      confirmPassword: 'password123',
    };

    // TEST 1 : Inscription réussie avec des données valides
    it('devrait créer un nouvel utilisateur avec succès', () => {
      return request(app.getHttpServer())
        .post('/auth/register')
        .send(validRegisterData)
        .expect(201) // HTTP 201 Created
        .expect((res) => {
          const body = res.body as AuthResponse;
          // Vérifie la structure de la réponse
          expect(body).toHaveProperty('accessToken');
          expect(body).toHaveProperty('user');
          expect(body.user).toHaveProperty('email', validRegisterData.email);
          expect(body.user).not.toHaveProperty('passwordHash'); // Sécurité
        });
    });

    // TEST 2 : Échec si l'email est invalide
    it('devrait rejeter un email invalide', () => {
      return request(app.getHttpServer())
        .post('/auth/register')
        .send({
          email: 'invalid-email', // ❌ Format invalide
          password: 'password123',
          confirmPassword: 'password123',
        })
        .expect(400) // HTTP 400 Bad Request
        .expect((res) => {
          const body = res.body as ErrorResponse;
          // Vérifie que le message d'erreur mentionne l'email
          const messages = Array.isArray(body.message) ? body.message : [body.message];
          expect(messages).toEqual(expect.arrayContaining([expect.stringContaining('email')]));
        });
    });

    // TEST 3 : Échec si le mot de passe est trop court
    it('devrait rejeter un mot de passe trop court', () => {
      return request(app.getHttpServer())
        .post('/auth/register')
        .send({
          email: 'test@example.com',
          password: '123', // ❌ Moins de 8 caractères
          confirmPassword: '123',
        })
        .expect(400)
        .expect((res) => {
          const body = res.body as ErrorResponse;
          // Vérifie que le message d'erreur mentionne la longueur
          const messages = Array.isArray(body.message) ? body.message : [body.message];
          expect(messages).toEqual(expect.arrayContaining([expect.stringContaining('8 caractères')]));
        });
    });

    // TEST 4 : Échec si les mots de passe ne correspondent pas
    it('devrait rejeter des mots de passe différents', () => {
      return request(app.getHttpServer())
        .post('/auth/register')
        .send({
          email: 'test@example.com',
          password: 'password123',
          confirmPassword: 'password456', // ❌ Différent
        })
        .expect(400)
        .expect((res) => {
          const body = res.body as ErrorResponse;
          // Vérifie que le message d'erreur mentionne la correspondance
          const messages = Array.isArray(body.message) ? body.message : [body.message];
          expect(messages).toEqual(expect.arrayContaining([expect.stringContaining('correspondent pas')]));
        });
    });

    // TEST 5 : Échec si l'email est déjà utilisé
    it('devrait rejeter un email déjà utilisé', async () => {
      // Crée d'abord un utilisateur
      await request(app.getHttpServer()).post('/auth/register').send(validRegisterData).expect(201);

      // Tente de créer un autre utilisateur avec le même email
      return request(app.getHttpServer())
        .post('/auth/register')
        .send(validRegisterData)
        .expect(409) // HTTP 409 Conflict
        .expect((res) => {
          const body = res.body as ErrorResponse;
          const message = typeof body.message === 'string' ? body.message : body.message.join(' ');
          expect(message).toContain('déjà utilisé');
        });
    });

    // TEST 6 : Échec si le mot de passe est trop long
    it('devrait rejeter un mot de passe trop long', () => {
      return request(app.getHttpServer())
        .post('/auth/register')
        .send({
          email: 'test@example.com',
          password: 'a'.repeat(51), // ❌ Plus de 50 caractères
          confirmPassword: 'a'.repeat(51),
        })
        .expect(400)
        .expect((res) => {
          const body = res.body as ErrorResponse;
          const messages = Array.isArray(body.message) ? body.message : [body.message];
          expect(messages).toEqual(expect.arrayContaining([expect.stringContaining('50 caractères')]));
        });
    });

    // TEST 7 : Échec si des champs supplémentaires sont envoyés
    it('devrait rejeter des propriétés non autorisées', () => {
      return request(app.getHttpServer())
        .post('/auth/register')
        .send({
          ...validRegisterData,
          isAdmin: true, // ❌ Propriété non définie dans le DTO
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

    // Crée un utilisateur AVANT chaque test de login
    beforeEach(async () => {
      await request(app.getHttpServer()).post('/auth/register').send(registerData).expect(201);
    });

    // TEST 8 : Connexion réussie avec des identifiants valides
    it('devrait connecter un utilisateur avec des identifiants valides', () => {
      return request(app.getHttpServer())
        .post('/auth/login')
        .send({
          email: registerData.email,
          password: registerData.password,
        })
        .expect(200) // HTTP 200 OK
        .expect((res) => {
          const body = res.body as AuthResponse;
          expect(body).toHaveProperty('accessToken');
          expect(body).toHaveProperty('user');
          expect(body.user.email).toBe(registerData.email);
        });
    });

    // TEST 9 : Échec si l'email n'existe pas
    it('devrait rejeter un email inexistant', () => {
      return request(app.getHttpServer())
        .post('/auth/login')
        .send({
          email: 'inexistant@example.com', // ❌ N'existe pas
          password: 'password123',
        })
        .expect(401) // HTTP 401 Unauthorized
        .expect((res) => {
          const body = res.body as ErrorResponse;
          const message = typeof body.message === 'string' ? body.message : body.message.join(' ');
          expect(message).toContain('Email ou mot de passe incorrect');
        });
    });

    // TEST 10 : Échec si le mot de passe est incorrect
    it('devrait rejeter un mot de passe incorrect', () => {
      return request(app.getHttpServer())
        .post('/auth/login')
        .send({
          email: registerData.email,
          password: 'wrongpassword', // ❌ Incorrect
        })
        .expect(401)
        .expect((res) => {
          const body = res.body as ErrorResponse;
          const message = typeof body.message === 'string' ? body.message : body.message.join(' ');
          expect(message).toContain('Email ou mot de passe incorrect');
        });
    });

    // TEST 11 : Échec si l'email est invalide
    it('devrait rejeter un email invalide', () => {
      return request(app.getHttpServer())
        .post('/auth/login')
        .send({
          email: 'invalid-email', // ❌ Format invalide
          password: 'password123',
        })
        .expect(400);
    });

    // TEST 12 : Échec si le mot de passe est vide
    it('devrait rejeter un mot de passe vide', () => {
      return request(app.getHttpServer())
        .post('/auth/login')
        .send({
          email: registerData.email,
          password: '', // ❌ Vide
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

    // Crée un utilisateur et récupère son token AVANT chaque test
    beforeEach(async () => {
      const response = await request(app.getHttpServer()).post('/auth/register').send(registerData).expect(201);

      const body = response.body as AuthResponse;
      accessToken = body.accessToken;
    });

    // TEST 13 : Récupération du profil avec un token valide
    it('devrait retourner le profil utilisateur avec un token valide', () => {
      return request(app.getHttpServer())
        .get('/auth/me')
        .set('Authorization', `Bearer ${accessToken}`) // ✅ Token JWT
        .expect(200)
        .expect((res) => {
          const body = res.body as UserProfileResponse;
          expect(body).toHaveProperty('email', registerData.email);
          expect(body).toHaveProperty('role');
          expect(body).not.toHaveProperty('passwordHash'); // Sécurité
        });
    });

    // TEST 14 : Échec sans token
    it('devrait rejeter une requête sans token', () => {
      return (
        request(app.getHttpServer())
          .get('/auth/me')
          // ❌ Pas de header Authorization
          .expect(401)
      );
    });

    // TEST 15 : Échec avec un token invalide
    it('devrait rejeter un token invalide', () => {
      return request(app.getHttpServer())
        .get('/auth/me')
        .set('Authorization', 'Bearer invalid-token-123') // ❌ Token invalide
        .expect(401);
    });

    // TEST 16 : Échec avec un token mal formaté
    it('devrait rejeter un token mal formaté', () => {
      return request(app.getHttpServer())
        .get('/auth/me')
        .set('Authorization', accessToken) // ❌ Manque "Bearer "
        .expect(401);
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

    // Crée un utilisateur et récupère son token AVANT chaque test
    beforeEach(async () => {
      const response = await request(app.getHttpServer()).post('/auth/register').send(registerData).expect(201);

      const body = response.body as AuthResponse;
      accessToken = body.accessToken;
    });

    // TEST 17 : Déconnexion réussie avec un token valide
    it('devrait déconnecter un utilisateur avec un token valide', () => {
      return request(app.getHttpServer())
        .post('/auth/logout')
        .set('Authorization', `Bearer ${accessToken}`) // ✅ Token JWT
        .expect(200)
        .expect((res) => {
          const body = res.body as LogoutResponse;
          expect(body).toHaveProperty('message');
        });
    });

    // TEST 18 : Échec sans token
    it('devrait rejeter une déconnexion sans token', () => {
      return (
        request(app.getHttpServer())
          .post('/auth/logout')
          // ❌ Pas de token
          .expect(401)
      );
    });
  });
});
