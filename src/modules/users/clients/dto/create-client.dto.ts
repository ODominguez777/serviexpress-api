import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsOptional, IsArray, IsEmail } from 'class-validator';
import { UserRole } from '../../enums/user-role.enum'; // Importar el enum

export class CreateClientDto {
  @ApiProperty({ enum: UserRole, default: UserRole.CLIENT })
  @IsString()
  @IsNotEmpty()
  role: UserRole.CLIENT; // Usar el enum para el campo role

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
  @IsOptional()
  @IsString()
  source?: string;

  @ApiProperty()
  @IsString()
  @IsOptional()
  phone?: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  municipality: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  neighborhood: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  address: string;

  @ApiProperty({ type: [String], description: 'Preferencias del cliente' })
  @IsArray()
  @IsOptional()
  @IsString({ each: true })
  preferences?: string[];
}