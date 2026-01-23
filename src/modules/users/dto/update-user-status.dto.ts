// src/modules/users/dto/update-user-status.dto.ts
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsString, MaxLength } from 'class-validator';
import { UserStatus } from '../entities/user.entity';

export class UpdateUserStatusDto {
  @ApiProperty({
    description: 'Nouveau statut',
    enum: UserStatus,
    example: UserStatus.SUSPENDED,
  })
  @IsEnum(UserStatus, { message: 'Le statut doit être une valeur valide' })
  status!: UserStatus;

  @ApiPropertyOptional({
    description: 'Raison du changement de statut (pour les logs)',
    example: "Violation des conditions d'utilisation",
    maxLength: 500,
  })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  reason?: string;
}
