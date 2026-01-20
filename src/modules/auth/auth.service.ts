import { Injectable, ConflictException, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { User, UserStatus } from '../users/entities/user.entity';
import { Role } from '../roles/entities/role.entity';
import { RegisterDto, LoginDto } from './dto';

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>,
    @InjectRepository(Role)
    private roleRepository: Repository<Role>,
    private jwtService: JwtService,
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
    });

    // Enregistre l'utilisateur dans la base de données
    await this.userRepository.save(user);

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
      throw new UnauthorizedException('Email ou mot de passe incorrect');
    }

    // Vérifie le mot de passe
    const isPasswordValid = await bcrypt.compare(password, user.passwordHash);
    if (!isPasswordValid) {
      throw new UnauthorizedException('Email ou mot de passe incorrect');
    }

    // Vérifie que l'utilisateur est actif
    if (user.status !== UserStatus.ACTIVE) {
      throw new UnauthorizedException('Ce compte est désactivé');
    }

    // Met à jour la date de dernière connexion
    user.lastLoginAt = new Date();
    await this.userRepository.save(user);

    // Génère le token JWT
    const accessToken = this.generateToken(user);

    return {
      accessToken,
      user: this.sanitizeUser(user),
    };
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
