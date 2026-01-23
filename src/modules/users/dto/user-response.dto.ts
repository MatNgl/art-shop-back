import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { UserStatus, AuthProvider } from '../entities/user.entity';

// DTO pour le rôle
class RoleDto {
  @ApiProperty({ example: 'edde52aa-3659-4177-9689-9cf45caaee78' })
  id!: string;

  @ApiProperty({ example: 'USER' })
  code!: string;

  @ApiProperty({ example: 'Utilisateur' })
  label!: string;
}

// DTO pour un utilisateur
export class UserDto {
  @ApiProperty({
    description: 'Identifiant unique',
    example: 'edde52aa-3659-4177-9689-9cf45caaee78',
  })
  id!: string;

  @ApiProperty({
    description: 'Adresse email',
    example: 'john.doe@example.com',
  })
  email!: string;

  @ApiPropertyOptional({
    description: 'Prénom',
    example: 'John',
  })
  firstName?: string;

  @ApiPropertyOptional({
    description: 'Nom',
    example: 'Doe',
  })
  lastName?: string;

  @ApiPropertyOptional({
    description: "Nom d'affichage",
    example: 'Johnny',
  })
  displayName?: string;

  @ApiPropertyOptional({
    description: 'Téléphone',
    example: '+33612345678',
  })
  phone?: string;

  @ApiProperty({
    description: 'Statut du compte',
    enum: UserStatus,
    example: UserStatus.ACTIVE,
  })
  status!: UserStatus;

  @ApiProperty({
    description: "Fournisseur d'authentification",
    enum: AuthProvider,
    example: AuthProvider.LOCAL,
  })
  authProvider!: AuthProvider;

  @ApiPropertyOptional({
    description: "URL de l'avatar",
    example: 'https://example.com/avatar.jpg',
  })
  avatarUrl?: string;

  @ApiProperty({
    description: "Rôle de l'utilisateur",
    type: RoleDto,
  })
  role!: RoleDto;

  @ApiPropertyOptional({
    description: 'Dernière connexion',
    example: '2025-01-23T10:30:00.000Z',
  })
  lastLoginAt?: Date;

  @ApiProperty({
    description: 'Date de création',
    example: '2025-01-01T00:00:00.000Z',
  })
  createdAt!: Date;

  @ApiProperty({
    description: 'Date de mise à jour',
    example: '2025-01-23T10:30:00.000Z',
  })
  updatedAt!: Date;
}

// DTO pour la pagination
class PaginationMetaDto {
  @ApiProperty({ example: 1 })
  page!: number;

  @ApiProperty({ example: 20 })
  limit!: number;

  @ApiProperty({ example: 150 })
  total!: number;

  @ApiProperty({ example: 8 })
  totalPages!: number;

  @ApiProperty({ example: true })
  hasNextPage!: boolean;

  @ApiProperty({ example: false })
  hasPreviousPage!: boolean;
}

// Réponse paginée
export class PaginatedUsersResponseDto {
  @ApiProperty({
    description: 'Liste des utilisateurs',
    type: [UserDto],
  })
  data!: UserDto[];

  @ApiProperty({
    description: 'Métadonnées de pagination',
    type: PaginationMetaDto,
  })
  meta!: PaginationMetaDto;
}

// Statistiques des utilisateurs
export class UsersStatsDto {
  @ApiProperty({ description: "Nombre total d'utilisateurs", example: 150 })
  total!: number;

  @ApiProperty({ description: 'Utilisateurs actifs', example: 120 })
  active!: number;

  @ApiProperty({ description: 'Utilisateurs inactifs', example: 20 })
  inactive!: number;

  @ApiProperty({ description: 'Utilisateurs suspendus', example: 10 })
  suspended!: number;

  @ApiProperty({
    description: 'Répartition par rôle',
    example: { SUPER_ADMIN: 1, ADMIN: 5, USER: 140, GUEST: 4 },
  })
  byRole!: Record<string, number>;

  @ApiProperty({
    description: "Répartition par fournisseur d'auth",
    example: { LOCAL: 100, GOOGLE: 50 },
  })
  byAuthProvider!: Record<string, number>;
}
