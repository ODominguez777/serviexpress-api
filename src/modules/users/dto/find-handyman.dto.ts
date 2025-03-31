import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsArray, IsString, IsNumber } from 'class-validator';
import { Transform } from 'class-transformer';

export class FindHandymenDto {
  @ApiProperty({
    required: false,
    description: 'Filter handymen by skills',
    type: [String],
  })
  @IsOptional() // Hace que skills sea opcional
  @IsArray() // Valida que skills sea un arreglo
  @IsString({ each: true }) // Valida que cada elemento en el arreglo sea un string
  @Transform(({ value }) => (typeof value === 'string' ? [value] : value)) // Si es solo un string, conviértelo en un arreglo
  skills?: string[]; // Arreglo de skills

  @ApiProperty({
    required: false,
    description: 'Page number for pagination',
    default: 1,
  })
  @IsOptional()
  @IsNumber()
  @Transform(({ value }) => Number(value)) // Convierte el valor a un número
  page: number = 1;

  @ApiProperty({
    required: false,
    description: 'Limit number for pagination',
    default: 10,
  })
  @IsOptional()
  @IsNumber()
  @Transform(({ value }) => Number(value)) // Convierte el valor a un número
  limit: number = 10;
}
