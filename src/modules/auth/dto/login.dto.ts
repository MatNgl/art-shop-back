import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsString, MinLength, MaxLength } from 'class-validator';

export class LoginDto {
  @ApiProperty({
    description: 'Adresse email',
    example: 'user@example.com',
  })
  @IsEmail({}, { message: "L'adresse email doit être valide" })
  email!: string;

  @ApiProperty({
    description: 'Mot de passe',
    example: 'password123',
  })
  @IsString()
  @MinLength(8)
  @MaxLength(50)
  password!: string;
}
