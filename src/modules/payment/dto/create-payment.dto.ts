import { IsEmail, IsNotEmpty, IsNumber } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreatePaymentDto {
  @ApiProperty({
    description: 'Monto de la cotización',
    example: 150.75,
  })
  @IsNotEmpty()
  @IsNumber()
  amount: number; // Monto de la cotización

  @ApiProperty({
    description: 'Email del handyman',
    example: 'handyman@serviexpress.com',
  })
  @IsNotEmpty()
  @IsEmail()
  handymanEmail: string; // Descripción de la cotización
}
