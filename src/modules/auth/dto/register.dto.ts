import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsString, MinLength, MaxLength, Validate } from 'class-validator';
import { ValidatorConstraint, ValidatorConstraintInterface, ValidationArguments } from 'class-validator';

// Validateur personnalisé pour vérifier que les mots de passe correspondent
@ValidatorConstraint({ name: 'MatchPasswords', async: false })
export class MatchPasswordsConstraint implements ValidatorConstraintInterface {
  validate(confirmPassword: string, args: ValidationArguments): boolean {
    const object = args.object as RegisterDto;
    return confirmPassword === object.password;
  }

  defaultMessage(): string {
    return 'Les mots de passe ne correspondent pas';
  }
}

// DTO pour l'inscription
export class RegisterDto {
  @ApiProperty({
    description: "Adresse email de l'utilisateur",
    example: 'user@example.com',
  })
  @IsEmail({}, { message: "L'adresse email doit être valide" })
  email!: string;

  @ApiProperty({
    description: 'Mot de passe(min 8 caractères)',
    example: 'password123',
  })
  @IsString()
  @MinLength(6, { message: 'Le mot de passe doit contenir au moins 8 caractères' })
  @MaxLength(50, { message: 'Le mot de passe ne peut pas dépasser 50 caractères' })
  password!: string;

  @ApiProperty({
    description: 'Confirmation du mot de passe',
    example: 'password123',
  })
  @IsString()
  @Validate(MatchPasswordsConstraint)
  confirmPassword!: string;
}
