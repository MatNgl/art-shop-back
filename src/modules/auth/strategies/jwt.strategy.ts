// La stratégie JWT valide et décode le token envoyé par l'utilisateur

import { Injectable, UnauthorizedException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy, ExtractJwt } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { Repository } from 'typeorm';
import { User } from '../../users/entities/user.entity';

// Structure du payload dans le token JWT
interface JwtPayload {
  sub: string; // ID de l'utilisateur
  email: string;
  role: string;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    private configService: ConfigService,
    @InjectRepository(User)
    private userRepository: Repository<User>,
  ) {
    const jwtSecret = configService.get<string>('JWT_SECRET');
    if (!jwtSecret) {
      throw new Error('JWT_SECRET is not defined in environment variables');
    }

    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(), //Extrait le token du header `Authorization: Bearer xxx`
      ignoreExpiration: false, // Rejette les tokens expirés
      secretOrKey: jwtSecret, // Clé secrète pour vérifier la signature du token
    });
  }

  async validate(payload: JwtPayload): Promise<User> {
    // Appelé après vérification du token, retourne l'utilisateur
    const user = await this.userRepository.findOne({
      where: { id: payload.sub },
      relations: ['role'],
    });

    if (!user) {
      throw new UnauthorizedException('Utilisateur non trouvé');
    }

    return user;
  }
}
