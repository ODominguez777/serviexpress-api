import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsOptional, IsArray } from 'class-validator';
import { Types } from 'mongoose';

export class UpdateClientDto {
  @ApiProperty({ required: false })
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

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  municipality?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  neighborhood?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  address?: string;

  @ApiProperty({ type: [String], required: false })
  @IsOptional()
  @IsArray()
  preferences?: string[];

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  refreshToken?: string; // Campo para el refresh token
}