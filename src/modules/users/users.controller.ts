// src/modules/users/users.controller.ts
import {
  Controller,
  Get,
  Patch,
  Delete,
  Param,
  Query,
  Body,
  UseGuards,
  Request,
  ParseUUIDPipe,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiParam } from '@nestjs/swagger';
import { UsersService } from './users.service';
import { JwtAuthGuard, RolesGuard } from '../auth/guards';
import { Roles } from '../auth/decorators';
import { User } from './entities/user.entity';
import {
  GetUsersQueryDto,
  PaginatedUsersResponseDto,
  UserDto,
  UpdateUserDto,
  UpdateUserStatusDto,
  UsersStatsDto,
} from './dto';
import { Role } from '../roles/entities/role.entity';

interface RequestWithUser extends Request {
  user: User;
}

@ApiTags('Utilisateurs')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('SUPER_ADMIN', 'ADMIN')
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  /**
   * Liste des utilisateurs avec pagination et filtres
   */
  @Get()
  @ApiOperation({
    summary: 'Liste des utilisateurs',
    description: 'Récupère la liste paginée des utilisateurs avec possibilité de filtrer. Réservé aux administrateurs.',
  })
  @ApiResponse({
    status: 200,
    description: 'Liste paginée des utilisateurs',
    type: PaginatedUsersResponseDto,
  })
  @ApiResponse({ status: 401, description: 'Non authentifié' })
  @ApiResponse({ status: 403, description: 'Accès refusé' })
  async findAll(@Query() query: GetUsersQueryDto): Promise<PaginatedUsersResponseDto> {
    const { page = 1, limit = 20 } = query;
    const { users, total } = await this.usersService.findAll(query);

    const totalPages = Math.ceil(total / limit);

    return {
      data: users.map((user) => this.sanitizeUser(user)),
      meta: {
        page,
        limit,
        total,
        totalPages,
        hasNextPage: page < totalPages,
        hasPreviousPage: page > 1,
      },
    };
  }

  /**
   * Statistiques des utilisateurs
   */
  @Get('stats')
  @ApiOperation({
    summary: 'Statistiques des utilisateurs',
    description: 'Récupère les statistiques globales des utilisateurs',
  })
  @ApiResponse({
    status: 200,
    description: 'Statistiques',
    type: UsersStatsDto,
  })
  async getStats(): Promise<UsersStatsDto> {
    return this.usersService.getStats();
  }

  /**
   * Liste des rôles disponibles
   */
  @Get('roles')
  @ApiOperation({
    summary: 'Liste des rôles',
    description: "Récupère la liste des rôles disponibles pour l'attribution",
  })
  @ApiResponse({
    status: 200,
    description: 'Liste des rôles',
  })
  async getRoles(): Promise<Role[]> {
    return this.usersService.getAvailableRoles();
  }

  /**
   * Détails d'un utilisateur
   */
  @Get(':id')
  @ApiOperation({
    summary: "Détails d'un utilisateur",
    description: "Récupère les informations complètes d'un utilisateur",
  })
  @ApiParam({
    name: 'id',
    description: "UUID de l'utilisateur",
    example: 'edde52aa-3659-4177-9689-9cf45caaee78',
  })
  @ApiResponse({
    status: 200,
    description: "Détails de l'utilisateur",
    type: UserDto,
  })
  @ApiResponse({ status: 404, description: 'Utilisateur non trouvé' })
  async findOne(@Param('id', ParseUUIDPipe) id: string): Promise<UserDto> {
    const user = await this.usersService.findById(id);
    return this.sanitizeUser(user);
  }

  /**
   * Modification d'un utilisateur
   */
  @Patch(':id')
  @ApiOperation({
    summary: 'Modifier un utilisateur',
    description: "Met à jour les informations d'un utilisateur. Un ADMIN ne peut pas modifier un SUPER_ADMIN.",
  })
  @ApiParam({
    name: 'id',
    description: "UUID de l'utilisateur",
  })
  @ApiResponse({
    status: 200,
    description: 'Utilisateur mis à jour',
    type: UserDto,
  })
  @ApiResponse({ status: 403, description: 'Action non autorisée' })
  @ApiResponse({ status: 404, description: 'Utilisateur non trouvé' })
  @ApiResponse({ status: 409, description: 'Email déjà utilisé' })
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateUserDto: UpdateUserDto,
    @Request() req: RequestWithUser,
  ): Promise<UserDto> {
    const user = await this.usersService.update(id, updateUserDto, req.user);
    return this.sanitizeUser(user);
  }

  /**
   * Changement de statut (activer/désactiver/suspendre)
   */
  @Patch(':id/status')
  @ApiOperation({
    summary: "Changer le statut d'un utilisateur",
    description: 'Active, désactive ou suspend un compte utilisateur',
  })
  @ApiParam({
    name: 'id',
    description: "UUID de l'utilisateur",
  })
  @ApiResponse({
    status: 200,
    description: 'Statut mis à jour',
    type: UserDto,
  })
  @ApiResponse({ status: 400, description: 'Action invalide (ex: modifier son propre statut)' })
  @ApiResponse({ status: 403, description: 'Action non autorisée' })
  @ApiResponse({ status: 404, description: 'Utilisateur non trouvé' })
  async updateStatus(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateStatusDto: UpdateUserStatusDto,
    @Request() req: RequestWithUser,
  ): Promise<UserDto> {
    const user = await this.usersService.updateStatus(id, updateStatusDto, req.user);
    return this.sanitizeUser(user);
  }

  /**
   * Suppression d'un utilisateur
   */
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: 'Supprimer un utilisateur',
    description:
      'Supprime définitivement un utilisateur. Impossible de supprimer son propre compte ou le dernier SUPER_ADMIN.',
  })
  @ApiParam({
    name: 'id',
    description: "UUID de l'utilisateur",
  })
  @ApiResponse({ status: 204, description: 'Utilisateur supprimé' })
  @ApiResponse({ status: 400, description: 'Action invalide' })
  @ApiResponse({ status: 403, description: 'Action non autorisée' })
  @ApiResponse({ status: 404, description: 'Utilisateur non trouvé' })
  async remove(@Param('id', ParseUUIDPipe) id: string, @Request() req: RequestWithUser): Promise<void> {
    await this.usersService.remove(id, req.user);
  }

  /**
   * Retire le mot de passe hashé de la réponse
   */
  private sanitizeUser(user: User): UserDto {
    return {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      displayName: user.displayName,
      phone: user.phone,
      status: user.status,
      authProvider: user.authProvider,
      avatarUrl: user.avatarUrl,
      role: {
        id: user.role.id,
        code: user.role.code,
        label: user.role.label,
      },
      lastLoginAt: user.lastLoginAt,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };
  }
}
