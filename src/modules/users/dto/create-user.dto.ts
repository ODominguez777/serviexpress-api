import { ApiProperty } from '@nestjs/swagger';
import {
  IsString,
  IsEmail,
  IsEnum,
  IsOptional,
  IsArray,
  IsNotEmpty,
  ValidateIf,
  IsNumber,
  Min,
  Max,
} from 'class-validator';
import { Types } from 'mongoose';

enum UserRole {
  CLIENT = 'client',
  HANDYMAN = 'handyman',
  ADMIN = 'admin',
}

export class CreateUserDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  googleId: string;

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
  phone?: string;

  @ApiProperty({ enum: UserRole })
  @IsEnum(UserRole)
  @IsNotEmpty()
  role: UserRole;

  @ApiProperty({ description: 'Solo Cliente' })
  @ValidateIf((o) => o.role === UserRole.CLIENT)
  @IsNotEmpty()
  @IsString()
  municipality: string;

  @ApiProperty({ description: 'Solo Cliente' })
  @ValidateIf((o) => o.role === UserRole.CLIENT)
  @IsNotEmpty()
  @IsString()
  neighborhood: string;

  @ApiProperty({ description: 'Solo Cliente' })
  @ValidateIf((o) => o.role === UserRole.CLIENT)
  @IsNotEmpty()
  @IsString()
  address: string;

  @ApiProperty()
  @IsOptional()
  @IsString()
  source?: string;

  // 🔹 OBLIGATORIO SOLO PARA HANDYMAN
  @ApiProperty({ description: 'Solo handyman' })
  @ValidateIf((o) => o.role === UserRole.HANDYMAN)
  @IsString()
  @IsNotEmpty()
  personalDescription?: string;

  @ApiProperty({ type: [String], description: 'Solo handyman' })
  @ValidateIf((o) => o.role === UserRole.HANDYMAN)
  @IsArray()
  @IsNotEmpty()
  skills?: Types.ObjectId[];

  @ApiProperty({ type: [String], description: 'Solo handyman' })
  @ValidateIf((o) => o.role === UserRole.HANDYMAN)
  @IsArray()
  @IsNotEmpty()
  coverageArea?: string[];

  @ApiProperty({ type: Number, description: 'Solo handyman' })
  @ValidateIf((o) => o.role === UserRole.HANDYMAN)
  @IsNumber()
  @IsOptional()
  @Min(0)
  @Max(5)
  rating?: number = 0;

  //  SOLO PARA CLIENTE
  @ApiProperty({ type: [String], description: 'Solo cliente' })
  @ValidateIf((o) => o.role === UserRole.CLIENT)
  @IsArray()
  @IsOptional()
  preferences?: Types.ObjectId[];
}
