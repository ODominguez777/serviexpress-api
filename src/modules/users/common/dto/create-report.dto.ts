import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, IsMongoId } from 'class-validator';

export class CreateReportDto {
  @ApiProperty({
    description: 'ID del usuario reportado',
    example: '681a1c7e4239b846a46ac4c6',
  })
  @IsNotEmpty()
  @IsMongoId()
  reportedUserId: string;

  @ApiProperty({
    description: 'Título del reporte',
    example: 'Comportamiento inapropiado',
  })
  @IsNotEmpty()
  @IsString()
  title: string;

  @ApiProperty({
    description: 'Descripción del reporte',
    example: 'El usuario fue irrespetuoso durante la interacción.',
  })
  @IsNotEmpty()
  @IsString()
  description: string;
}