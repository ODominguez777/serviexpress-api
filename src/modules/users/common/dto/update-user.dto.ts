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

export class UpdateUserDto {
  @ApiProperty({ required: false }) // Indica que este campo es opcional en Swagger
  @IsOptional()
  @IsString()
  name?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  lastName?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  profilePicture?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  phone?: string;

  @ApiProperty({ description: 'Solo Cliente', required: false })
  @ValidateIf((o) => o.role === UserRole.CLIENT)
  @IsOptional()
  @IsString()
  municipality?: string;

  @ApiProperty({ description: 'Solo Cliente', required: false })
  @ValidateIf((o) => o.role === UserRole.CLIENT)
  @IsOptional()
  @IsString()
  neighborhood?: string;

  @ApiProperty({ description: 'Solo Cliente', required: false })
  @ValidateIf((o) => o.role === UserRole.CLIENT)
  @IsOptional()
  @IsString()
  address?: string;

  @ApiProperty({ description: 'Solo handyman', required: false })
  @ValidateIf((o) => o.role === UserRole.HANDYMAN)
  @IsOptional()
  @IsString()
  personalDescription?: string;

  @ApiProperty({ type: [String], description: 'Solo handyman', required: false })
  @ValidateIf((o) => o.role === UserRole.HANDYMAN)
  @IsOptional()
  @IsArray()
  skills?: Types.ObjectId[];

  @ApiProperty({ type: [String], description: 'Solo handyman', required: false })
  @ValidateIf((o) => o.role === UserRole.HANDYMAN)
  @IsOptional()
  @IsArray()
  coverageArea?: string[];

  @ApiProperty({ type: [String], description: 'Solo cliente', required: false })
  @ValidateIf((o) => o.role === UserRole.CLIENT)
  @IsOptional()
  @IsArray()
  preferences?: Types.ObjectId[];
}
