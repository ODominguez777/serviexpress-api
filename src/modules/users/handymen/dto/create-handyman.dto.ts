import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsOptional, IsArray, Min, Max, IsNumber, IsEmail } from 'class-validator';
import { UserRole } from '../../enums/user-role.enum'; // Importar el enum

export class CreateHandymanDto {
  @ApiProperty({ enum: UserRole, default: UserRole.HANDYMAN })
  @IsString()
  @IsNotEmpty()
  role: UserRole.HANDYMAN; // Usar el enum para el campo role

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  googleId: string; // ID de Google para autenticación

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  lastName: string;

  @ApiProperty()
  @IsNotEmpty()
  @IsString()
  profilePicture?: string;

  @ApiProperty()
  @IsEmail()
  @IsNotEmpty()
  email: string;

  @ApiProperty()
  @IsString()
  @IsOptional()
  phone?: string;

  @ApiProperty({ type: [String], description: 'Habilidades del handyman' })
  @IsArray()
  @IsNotEmpty()
  @IsString({ each: true })
  skills: string[];

  @ApiProperty({ type: [String], description: 'Áreas de cobertura' })
  @IsArray()
  @IsOptional()
  @IsString({ each: true })
  coverageArea?: string[];

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  personalDescription: string;

  @ApiProperty({ type: Number, description: 'Calificación inicial' })
  @IsNumber()
  @IsOptional()
  @Min(0)
  @Max(5)
  rating?: number;
}