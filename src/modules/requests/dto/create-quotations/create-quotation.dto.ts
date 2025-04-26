import {
  IsNotEmpty,
  IsNumber,
  IsString,
  IsEnum,
  IsDate,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger'; // Importar ApiProperty
import { QuotationStatus } from '../../schemas/quotation-schema/quotation.schema'; // Asegúrate de que la ruta sea correcta

export enum QuotationAction {
  ACCEPT = 'accept',
  REJECT = 'reject',
}
export class CreateQuotationDto {
  @ApiProperty({
    description: 'Acción a realizar: aceptar o rechazar la solicitud',
    enum: ['accept', 'reject'],
    example: 'accept',
  })
  @IsNotEmpty()
  @IsEnum(QuotationAction)
  action: 'accept' | 'reject';

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
