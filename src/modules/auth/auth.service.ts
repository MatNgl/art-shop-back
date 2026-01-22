import { Injectable, ConflictException, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { User, UserStatus, AuthProvider } from '../users/entities/user.entity';
import { Role } from '../roles/entities/role.entity';
import { RegisterDto, LoginDto } from './dto';
import { ActivityLogService, ActorType, ActionType, EntityType, LogSeverity } from '../activity-logs';

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>,
    @InjectRepository(Role)
    private roleRepository: Repository<Role>,
    private jwtService: JwtService,
    private activityLogService: ActivityLogService,
  ) {}

  // Inscription d'un nouvel utilisateur
  async register(registerDto: RegisterDto): Promise<{ accessToken: string; user: Partial<User> }> {
    const { email, password } = registerDto;

    // Vérifie si l'email existe déjà
    const existingUser = await this.userRepository.findOne({ where: { email } });
    if (existingUser) {
      throw new ConflictException('Cet email est déjà utilisé.');
    }

    // Récupère le rôle par défaut (ex: "USER")
    const userRole = await this.roleRepository.findOne({ where: { code: 'USER' } });
    if (!userRole) {
      throw new Error("le rôle USER n'existe pas dans la base de données.");
    }

    // Hash du mot de passe
    const saltRounds = 10;
    const passwordHash = await bcrypt.hash(password, saltRounds);

    // Crée l'utilisateur
    const user = this.userRepository.create({
      email,
      passwordHash,
      role: userRole,
      roleId: userRole.id,
      status: UserStatus.ACTIVE,
      authProvider: AuthProvider.LOCAL,
    });

    // Enregistre l'utilisateur dans la base de données
    await this.userRepository.save(user);

    // Log l'action d'inscription
    await this.activityLogService.log({
      actorType: ActorType.USER,
      actorUserId: user.id,
      actionType: ActionType.USER_REGISTERED,
      entityType: EntityType.USER,
      entityId: user.id,
      severity: LogSeverity.INFO,
      metadata: {
        email: user.email,
        authProvider: user.authProvider,
        roleCode: userRole.code,
      },
    });

    // Génère un token JWT pour l'utilisateur
    const accessToken = this.generateToken(user);

    return { accessToken, user: this.sanitizeUser(user) };
  }
  /**
   * Connexion d'un utilisateur
   */
  async login(loginDto: LoginDto): Promise<{ accessToken: string; user: Partial<User> }> {
    const { email, password } = loginDto;

    // Recherche l'utilisateur avec son rôle
    const user = await this.userRepository.findOne({
      where: { email },
      relations: ['role'],
    });

    if (!user) {
      // ✅ LOG : Échec - utilisateur non trouvé
      await this.activityLogService.log({
        actorType: ActorType.GUEST,
        actionType: ActionType.USER_LOGIN_FAILED,
        entityType: EntityType.USER,
        severity: LogSeverity.WARNING,
        metadata: {
          email,
          reason: 'USER_NOT_FOUND',
        },
      });
      throw new UnauthorizedException('Email ou mot de passe incorrect');
    }

    // Vérifie que l'utilisateur utilise l'auth locale (pas Google)
    if (!user.passwordHash) {
      // ✅ LOG : Échec - compte Google
      await this.activityLogService.log({
        actorType: ActorType.USER,
        actorUserId: user.id,
        actionType: ActionType.USER_LOGIN_FAILED,
        entityType: EntityType.USER,
        entityId: user.id,
        severity: LogSeverity.WARNING,
        metadata: {
          email,
          reason: 'GOOGLE_ACCOUNT_NO_PASSWORD',
        },
      });
      throw new UnauthorizedException('Ce compte utilise la connexion Google');
    }

    // Vérifie le mot de passe
    const isPasswordValid = await bcrypt.compare(password, user.passwordHash);
    if (!isPasswordValid) {
      //LOG : Échec - mot de passe incorrect
      await this.activityLogService.log({
        actorType: ActorType.USER,
        actorUserId: user.id,
        actionType: ActionType.USER_LOGIN_FAILED,
        entityType: EntityType.USER,
        entityId: user.id,
        severity: LogSeverity.WARNING,
        metadata: {
          email,
          reason: 'INVALID_PASSWORD',
        },
      });
      throw new UnauthorizedException('Email ou mot de passe incorrect');
    }

    // Vérifie que l'utilisateur est actif
    if (user.status !== UserStatus.ACTIVE) {
      // ✅ LOG : Échec - compte inactif
      await this.activityLogService.log({
        actorType: ActorType.USER,
        actorUserId: user.id,
        actionType: ActionType.USER_LOGIN_FAILED,
        entityType: EntityType.USER,
        entityId: user.id,
        severity: LogSeverity.WARNING,
        metadata: {
          email,
          reason: 'ACCOUNT_INACTIVE',
          status: user.status,
        },
      });
      throw new UnauthorizedException('Ce compte est désactivé');
    }

    // Met à jour la date de dernière connexion
    user.lastLoginAt = new Date();
    await this.userRepository.save(user);

    // ✅ LOG : Connexion réussie
    await this.activityLogService.log({
      actorType: ActorType.USER,
      actorUserId: user.id,
      actionType: ActionType.USER_LOGIN,
      entityType: EntityType.USER,
      entityId: user.id,
      metadata: {
        email: user.email,
        authProvider: user.authProvider,
      },
    });

    // Génère le token JWT
    const accessToken = this.generateToken(user);

    return {
      accessToken,
      user: this.sanitizeUser(user),
    };
  }

  /* Connexion ou inscription via Google */
  async googleLogin(googleUser: {
    googleId: string;
    email: string;
    firstName?: string;
    lastName?: string;
    avatarUrl?: string;
  }): Promise<{ accessToken: string; user: Partial<User> }> {
    const { googleId, email, firstName, lastName, avatarUrl } = googleUser;

    // Cherche un utilisateur existant par googleId ou email
    let user = await this.userRepository.findOne({
      where: [{ googleId }, { email }],
      relations: ['role'],
    });

    if (user) {
      // Met à jour les infos Google si l'utilisateur existe
      if (!user.googleId) {
        user.googleId = googleId;
        user.authProvider = AuthProvider.GOOGLE;
      }
      user.avatarUrl = avatarUrl;
      user.lastLoginAt = new Date();
      await this.userRepository.save(user);
    } else {
      // Crée un nouvel utilisateur
      const userRole = await this.roleRepository.findOne({ where: { code: 'USER' } });
      if (!userRole) {
        throw new Error("Le rôle USER n'existe pas dans la base de données.");
      }

      user = this.userRepository.create({
        email,
        googleId,
        firstName,
        lastName,
        avatarUrl,
        authProvider: AuthProvider.GOOGLE,
        role: userRole,
        roleId: userRole.id,
        status: UserStatus.ACTIVE,
      });

      await this.userRepository.save(user);
    }
    await this.activityLogService.log({
      actorType: ActorType.USER,
      actorUserId: user.id,
      actionType: ActionType.USER_REGISTERED ?? ActionType.GOOGLE_AUTH_SUCCESS,
      entityType: EntityType.USER,
      entityId: user.id,
      metadata: {
        email: user.email,
        authProvider: AuthProvider.GOOGLE,
        googleId: user.googleId,
      },
    });
    const accessToken = this.generateToken(user);

    return {
      accessToken,
      user: this.sanitizeUser(user),
    };
  }
  /**
   * Déconnexion d'un utilisateur
   */
  async logout(userId: string): Promise<{ message: string }> {
    // ✅ LOG : Déconnexion
    await this.activityLogService.log({
      actorType: ActorType.USER,
      actorUserId: userId,
      actionType: ActionType.USER_LOGOUT,
      entityType: EntityType.USER,
      entityId: userId,
    });

    return { message: 'Déconnexion réussie' };
  }
  /**
   * Génère un token JWT
   */
  private generateToken(user: User): string {
    const payload = {
      sub: user.id,
      email: user.email,
    };

    return this.jwtService.sign(payload);
  }

  /**
   * Retourne l'utilisateur sans les données sensibles
   */
  private sanitizeUser(user: User): Partial<User> {
    const { passwordHash: _passwordHash, ...sanitizedUser } = user;
    return sanitizedUser;
  }
}
