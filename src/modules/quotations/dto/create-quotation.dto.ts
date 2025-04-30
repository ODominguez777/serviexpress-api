import {
  IsNotEmpty,
  IsNumber,
  IsString,
  IsEnum,
  IsDate,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { QuotationStatus } from '../schemas/quotation.schema'; 
export enum QuotationAction {
  ACCEPT = 'accept',
  REJECT = 'reject',
}
export class CreateQuotationDto {

  @ApiProperty({
    description: 'Monto de la cotización',
    example: 150.75,
  })
  @IsNotEmpty()
  @IsNumber()
  amount: number; // Monto de la cotización

  @ApiProperty({
    description: 'Descripción de la cotización',
    example: 'Reparación de tuberías en el baño principal',
  })
  @IsNotEmpty()
  @IsString()
  description: string; // Descripción de la cotización

}
