import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, IsEmail, IsUUID, MaxLength, Matches } from 'class-validator';

export class UpdateUserDto {
  @ApiPropertyOptional({
    description: 'Adresse email',
    example: 'john.doe@example.com',
  })
  @IsOptional()
  @IsEmail({}, { message: "L'adresse email doit être valide" })
  email?: string;

  @ApiPropertyOptional({
    description: 'Prénom',
    example: 'John',
  })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  firstName?: string;

  @ApiPropertyOptional({
    description: 'Nom',
    example: 'Doe',
  })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  lastName?: string;

  @ApiPropertyOptional({
    description: "Nom d'affichage",
    example: 'Johnny',
  })
  @IsOptional()
  @IsString()
  @MaxLength(150)
  displayName?: string;

  @ApiPropertyOptional({
    description: 'Téléphone',
    example: '+33612345678',
  })
  @IsOptional()
  @IsString()
  @MaxLength(30)
  @Matches(/^[\d\s+\-.()]*$/, { message: 'Le numéro de téléphone contient des caractères invalides' })
  phone?: string;

  @ApiPropertyOptional({
    description: 'ID du rôle à attribuer',
    example: 'edde52aa-3659-4177-9689-9cf45caaee78',
  })
  @IsOptional()
  @IsUUID('4', { message: "L'ID du rôle doit être un UUID valide" })
  roleId?: string;
}
