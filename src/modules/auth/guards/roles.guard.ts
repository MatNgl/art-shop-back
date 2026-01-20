import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { User } from '../../users/entities/user.entity';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    // Récupère les rôles requs définis par @Roles()
    const requiredRoles = this.reflector.getAllAndOverride<string[]>('roles', [
      context.getHandler(),
      context.getClass(),
    ]);

    // Si aucun rôle n'est requis, autorise l'accès
    if (!requiredRoles) {
      return true;
    }

    //Récupère l'utilisateur à partir du contexte de la requête
    const request = context.switchToHttp().getRequest<{ user: User }>();
    const user = request.user;

    // Vérifie si le role de l'utilisateur est dans les roles autorisés
    return requiredRoles.includes(user.role.code);
  }
}
