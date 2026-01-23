import { Test, TestingModule } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';
import { Repository } from 'typeorm';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ConflictException, UnauthorizedException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { AuthService } from './auth.service';
import { User, UserStatus, AuthProvider } from '../users/entities/user.entity';
import { Role } from '../roles/entities/role.entity';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { ActivityLogService } from '../activity-logs';

// ✅ SOLUTION : Mocker bcrypt au niveau du module (avant tous les tests)
// Cela évite les problèmes de "Cannot redefine property"
jest.mock('bcrypt', () => ({
  hash: jest.fn(), // Mock de la fonction hash
  compare: jest.fn(), // Mock de la fonction compare
}));

describe('AuthService', () => {
  let service: AuthService;
  let userRepository: jest.Mocked<Repository<User>>; // Typage explicite avec jest.Mocked
  let roleRepository: jest.Mocked<Repository<Role>>;
  let jwtService: jest.Mocked<JwtService>;

  // Données de test réutilisables - simulant des entités de la BDD
  const mockRole: Role = {
    id: 'role-id-123',
    code: 'USER',
    label: 'Utilisateur',
    createdAt: new Date(),
  };

  const mockUser: User = {
    id: 'user-id-123',
    email: 'test@example.com',
    passwordHash: 'hashed-password',
    roleId: mockRole.id,
    role: mockRole,
    status: UserStatus.ACTIVE,
    authProvider: AuthProvider.LOCAL,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  // Mock des repositories - on simule les méthodes TypeORM
  const mockUserRepository = {
    findOne: jest.fn(), // Simule la recherche d'un utilisateur
    create: jest.fn(), // Simule la création d'une instance User
    save: jest.fn(), // Simule l'enregistrement en BDD
    find: jest.fn(), // Simule la récupération de plusieurs utilisateurs
    count: jest.fn(), // Simule le comptage des utilisateurs
    remove: jest.fn(), // Simule la suppression d'un utilisateur
  };

  const mockRoleRepository = {
    findOne: jest.fn(), // Simule la recherche d'un rôle
    find: jest.fn(), // Simule la récupération de plusieurs rôles
  };

  const mockJwtService = {
    sign: jest.fn(), // Simule la génération d'un token JWT
  };

  const mockActivityLogService = {
    log: jest.fn().mockResolvedValue(null),
    logUserAction: jest.fn().mockResolvedValue(null),
    logError: jest.fn().mockResolvedValue(null),
  };

  // beforeEach : Prépare un environnement de test propre avant chaque test
  beforeEach(async () => {
    // Crée un module de test NestJS isolé
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService, // Le service qu'on teste
        {
          // Remplace le vrai UserRepository par notre mock
          provide: getRepositoryToken(User),
          useValue: mockUserRepository,
        },
        {
          // Remplace le vrai RoleRepository par notre mock
          provide: getRepositoryToken(Role),
          useValue: mockRoleRepository,
        },
        {
          // Remplace le vrai JwtService par notre mock
          provide: JwtService,
          useValue: mockJwtService,
        },
        {
          provide: ActivityLogService,
          useValue: mockActivityLogService,
        },
      ],
    }).compile();

    // Récupère les instances mockées depuis le module de test
    service = module.get<AuthService>(AuthService);
    userRepository = module.get(getRepositoryToken(User));
    roleRepository = module.get(getRepositoryToken(Role));
    jwtService = module.get<JwtService>(JwtService) as jest.Mocked<JwtService>;

    // Efface l'historique des appels de tous les mocks avant chaque test
    // Cela garantit que chaque test démarre avec un état propre
    jest.clearAllMocks();
  });

  // Test de base : vérifie que le service est bien instancié
  it('devrait être défini', () => {
    expect(service).toBeDefined();
  });

  // ========================================
  // Tests pour la méthode register()
  // ========================================
  describe('register', () => {
    // Données de test pour l'inscription
    const registerDto: RegisterDto = {
      email: 'newuser@example.com',
      password: 'password123',
      confirmPassword: 'password123',
    };

    // TEST 1 : Inscription réussie d'un nouvel utilisateur
    it('devrait créer un nouvel utilisateur avec succès', async () => {
      // === ARRANGE : Préparation des mocks ===
      mockUserRepository.findOne.mockResolvedValue(null); // Email n'existe pas encore
      mockRoleRepository.findOne.mockResolvedValue(mockRole); // Le rôle USER existe

      // Simule l'utilisateur qui sera créé
      const createdUser = {
        ...mockUser,
        email: registerDto.email,
      };

      mockUserRepository.create.mockReturnValue(createdUser); // Simule la création
      mockUserRepository.save.mockResolvedValue(createdUser); // Simule l'enregistrement
      mockJwtService.sign.mockReturnValue('mock-jwt-token'); // Simule la génération du token

      // Mock bcrypt.hash pour simuler le hashage du mot de passe
      (bcrypt.hash as jest.Mock).mockResolvedValue('hashed-password');

      // === ACT : Exécution de la méthode à tester ===
      const result = await service.register(registerDto);

      // === ASSERT : Vérification des résultats ===
      // Vérifie que le résultat contient un token d'accès
      expect(result).toHaveProperty('accessToken', 'mock-jwt-token');
      expect(result).toHaveProperty('user');
      expect(result.user.email).toBe(registerDto.email);

      // Vérifie que le mot de passe hashé n'est PAS retourné (sécurité)
      expect(result.user).not.toHaveProperty('passwordHash');

      // Vérifie que les méthodes ont été appelées avec les bons arguments
      expect(userRepository.findOne).toHaveBeenCalledWith({ where: { email: registerDto.email } });
      expect(roleRepository.findOne).toHaveBeenCalledWith({ where: { code: 'USER' } });
      expect(userRepository.save).toHaveBeenCalled();
      expect(jwtService.sign).toHaveBeenCalled();
    });

    // TEST 2 : Échec si l'email existe déjà
    it("devrait lever une ConflictException si l'email existe déjà", async () => {
      // === ARRANGE ===
      // Simule qu'un utilisateur avec cet email existe déjà
      mockUserRepository.findOne.mockResolvedValue(mockUser);

      // === ACT & ASSERT ===
      // Vérifie que la méthode lance bien une ConflictException
      await expect(service.register(registerDto)).rejects.toThrow(ConflictException);
      await expect(service.register(registerDto)).rejects.toThrow('Cet email est déjà utilisé.');

      // Vérifie qu'on n'a PAS tenté de créer l'utilisateur
      expect(userRepository.create).not.toHaveBeenCalled();
    });

    // TEST 3 : Échec si le rôle USER n'existe pas en BDD
    it("devrait lever une erreur si le rôle USER n'existe pas en base de données", async () => {
      // === ARRANGE ===
      mockUserRepository.findOne.mockResolvedValue(null); // Email n'existe pas
      mockRoleRepository.findOne.mockResolvedValue(null); // Mais le rôle USER n'existe pas

      // === ACT & ASSERT ===
      // Vérifie que la méthode lance une erreur explicite
      await expect(service.register(registerDto)).rejects.toThrow("le rôle USER n'existe pas dans la base de données.");
    });
  });

  // ========================================
  // Tests pour la méthode login()
  // ========================================
  describe('login', () => {
    // Données de test pour la connexion
    const loginDto: LoginDto = {
      email: 'test@example.com',
      password: 'password123',
    };

    // TEST 4 : Connexion réussie avec identifiants valides
    it('devrait connecter un utilisateur avec des identifiants valides', async () => {
      // === ARRANGE ===
      const userWithRole = {
        ...mockUser,
        lastLoginAt: new Date(),
      };

      mockUserRepository.findOne.mockResolvedValue(userWithRole); // Utilisateur trouvé
      mockUserRepository.save.mockResolvedValue(userWithRole); // Sauvegarde du lastLoginAt
      mockJwtService.sign.mockReturnValue('mock-jwt-token'); // Génération du token

      // Mock bcrypt.compare pour simuler une vérification de mot de passe réussie
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);

      // === ACT ===
      const result = await service.login(loginDto);

      // === ASSERT ===
      expect(result).toHaveProperty('accessToken', 'mock-jwt-token');
      expect(result).toHaveProperty('user');
      expect(result.user.email).toBe(loginDto.email);
      expect(result.user).not.toHaveProperty('passwordHash'); // Mot de passe pas retourné

      // Vérifie que les méthodes ont été appelées correctement
      expect(userRepository.findOne).toHaveBeenCalledWith({
        where: { email: loginDto.email },
        relations: ['role'], // Charge aussi la relation role
      });
      expect(bcrypt.compare).toHaveBeenCalledWith(loginDto.password, mockUser.passwordHash);
      expect(jwtService.sign).toHaveBeenCalled();
      expect(userRepository.save).toHaveBeenCalled(); // lastLoginAt mis à jour
    });

    // TEST 5 : Échec si l'utilisateur n'existe pas
    it("devrait lever une UnauthorizedException si l'utilisateur n'existe pas", async () => {
      // === ARRANGE ===
      mockUserRepository.findOne.mockResolvedValue(null); // Utilisateur non trouvé

      // === ACT & ASSERT ===
      await expect(service.login(loginDto)).rejects.toThrow(UnauthorizedException);
      await expect(service.login(loginDto)).rejects.toThrow('Email ou mot de passe incorrect');
    });

    // TEST 6 : Échec si le mot de passe est incorrect
    it('devrait lever une UnauthorizedException si le mot de passe est incorrect', async () => {
      // === ARRANGE ===
      mockUserRepository.findOne.mockResolvedValue(mockUser); // Utilisateur trouvé

      // Mock bcrypt.compare pour simuler un mot de passe incorrect
      (bcrypt.compare as jest.Mock).mockResolvedValue(false);

      // === ACT & ASSERT ===
      await expect(service.login(loginDto)).rejects.toThrow(UnauthorizedException);
      await expect(service.login(loginDto)).rejects.toThrow('Email ou mot de passe incorrect');
    });

    // TEST 7 : Échec si le compte utilise Google OAuth (pas de mot de passe local)
    it("devrait lever une UnauthorizedException si le compte utilise l'authentification Google", async () => {
      // === ARRANGE ===
      const googleUser = {
        ...mockUser,
        passwordHash: undefined, // Pas de mot de passe (authentification Google)
        authProvider: AuthProvider.GOOGLE,
      };

      mockUserRepository.findOne.mockResolvedValue(googleUser);

      // === ACT & ASSERT ===
      await expect(service.login(loginDto)).rejects.toThrow(UnauthorizedException);
      await expect(service.login(loginDto)).rejects.toThrow('Ce compte utilise la connexion Google');
    });

    // TEST 8 : Échec si le compte est désactivé/suspendu
    it("devrait lever une UnauthorizedException si le compte n'est pas actif", async () => {
      // === ARRANGE ===
      const inactiveUser = {
        ...mockUser,
        status: UserStatus.SUSPENDED, // Compte suspendu
      };

      mockUserRepository.findOne.mockResolvedValue(inactiveUser);

      // Mock bcrypt.compare pour simuler un mot de passe correct
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);

      // === ACT & ASSERT ===
      await expect(service.login(loginDto)).rejects.toThrow(UnauthorizedException);
      await expect(service.login(loginDto)).rejects.toThrow('Ce compte est désactivé');
    });
  });

  // ========================================
  // Tests pour la méthode googleLogin()
  // ========================================
  describe('googleLogin', () => {
    // Données de test pour l'authentification Google
    const googleUserData = {
      googleId: 'google-123',
      email: 'googleuser@example.com',
      firstName: 'John',
      lastName: 'Doe',
      avatarUrl: 'https://example.com/avatar.jpg',
    };

    // TEST 9 : Création d'un nouvel utilisateur via Google OAuth
    it("devrait créer un nouvel utilisateur si l'utilisateur Google n'existe pas", async () => {
      // === ARRANGE ===
      mockUserRepository.findOne.mockResolvedValue(null); // Utilisateur n'existe pas encore
      mockRoleRepository.findOne.mockResolvedValue(mockRole); // Rôle USER existe

      const newUser = {
        ...mockUser,
        email: googleUserData.email,
        googleId: googleUserData.googleId,
        authProvider: AuthProvider.GOOGLE,
      };

      mockUserRepository.create.mockReturnValue(newUser);
      mockUserRepository.save.mockResolvedValue(newUser);
      mockJwtService.sign.mockReturnValue('mock-jwt-token');

      // === ACT ===
      const result = await service.googleLogin(googleUserData);

      // === ASSERT ===
      expect(result).toHaveProperty('accessToken', 'mock-jwt-token');
      expect(result).toHaveProperty('user');
      expect(result.user.email).toBe(googleUserData.email);

      // Vérifie qu'on a cherché l'utilisateur par googleId OU par email
      expect(userRepository.findOne).toHaveBeenCalledWith({
        where: [{ googleId: googleUserData.googleId }, { email: googleUserData.email }],
        relations: ['role'],
      });

      // Vérifie qu'on a bien créé un nouvel utilisateur
      expect(roleRepository.findOne).toHaveBeenCalledWith({ where: { code: 'USER' } });
      expect(userRepository.create).toHaveBeenCalled();
      expect(userRepository.save).toHaveBeenCalled();
    });

    // TEST 10 : Mise à jour d'un utilisateur existant avec les données Google
    it('devrait mettre à jour un utilisateur existant avec les données Google', async () => {
      // === ARRANGE ===
      const existingUser = {
        ...mockUser,
        email: googleUserData.email,
        googleId: null, // N'avait pas encore de Google ID (inscription classique)
      };

      mockUserRepository.findOne.mockResolvedValue(existingUser);

      const updatedUser = {
        ...existingUser,
        googleId: googleUserData.googleId,
        authProvider: AuthProvider.GOOGLE,
        avatarUrl: googleUserData.avatarUrl,
        lastLoginAt: expect.any(Date),
      };

      mockUserRepository.save.mockResolvedValue(updatedUser);
      mockJwtService.sign.mockReturnValue('mock-jwt-token');

      // === ACT ===
      const result = await service.googleLogin(googleUserData);

      // === ASSERT ===
      expect(result).toHaveProperty('accessToken', 'mock-jwt-token');
      expect(userRepository.save).toHaveBeenCalled(); // Mise à jour de l'utilisateur existant
      expect(userRepository.create).not.toHaveBeenCalled(); // PAS de création (utilisateur existe)
    });

    // TEST 11 : Échec si le rôle USER n'existe pas pour un nouvel utilisateur Google
    it("devrait lever une erreur si le rôle USER n'existe pas pour un nouvel utilisateur Google", async () => {
      // === ARRANGE ===
      mockUserRepository.findOne.mockResolvedValue(null); // Utilisateur n'existe pas
      mockRoleRepository.findOne.mockResolvedValue(null); // Rôle USER n'existe pas

      // === ACT & ASSERT ===
      await expect(service.googleLogin(googleUserData)).rejects.toThrow(
        "Le rôle USER n'existe pas dans la base de données.",
      );
    });
  });
});
