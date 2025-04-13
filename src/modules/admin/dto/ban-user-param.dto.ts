import { IsMongoId } from 'class-validator';

export class BanUserParamDto {
  @IsMongoId()
  id: string; // Validar que sea un ID válido de MongoDB
}