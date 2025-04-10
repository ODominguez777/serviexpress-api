import { IsEmail, IsNumber, IsString, Max, Min } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class RateHandymanDto {

  @ApiProperty({ description: 'Email del handyman que recibe la calificación' })
  @IsEmail()
  handymanEmail: string;

  @ApiProperty({ description: 'Calificación otorgada (entre 1 y 5)' })
  @IsNumber()
  @Min(1)
  @Max(5)
  rating: number;
}