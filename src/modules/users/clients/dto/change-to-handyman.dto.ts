// src/modules/users/dto/change-to-handyman.dto.ts
import { IsString, IsNotEmpty, IsArray } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class ChangeToHandymanDto {
  @ApiProperty({
    description: 'Descripción personal del handyman',
    example: 'Soy un profesional con 10 años de experiencia en plomería.',
  })
  @IsString()
  @IsNotEmpty()
  personalDescription: string;

  @ApiProperty({
    description: 'Áreas de cobertura del handyman',
    example: ['Rivas', 'San Jorge'],
    type: [String],
  })
  @IsArray()
  @IsNotEmpty()
  coverageArea: string[];

  @ApiProperty({
    description: 'Habilidades del handyman',
    example: ['Plomería', 'Electricidad'],
    type: [String],
  })
  @IsArray()
  @IsNotEmpty()
  skills: string[];
}