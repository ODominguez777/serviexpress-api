import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsDate, IsArray, ValidateNested, IsEmail } from 'class-validator';
import { Type } from 'class-transformer';

class LocationDto {
  @ApiProperty({ required: true })
  @IsString()
  @IsNotEmpty()
  municipality: string;

  @ApiProperty({ required: true })
  @IsString()
  @IsNotEmpty()
  neighborhood: string;

  @ApiProperty({ required: true })
  @IsString()
  @IsNotEmpty()
  address: string;
}

export class CreateRequestDto {

  @ApiProperty({ required: true })
  @IsString()
  @IsNotEmpty()
  title: string;

  @ApiProperty({ required: true })
  @IsEmail()
  @IsNotEmpty()
  handymanEmail: string;

  @ApiProperty({ required: true })
  @IsString()
  @IsNotEmpty()
  description: string;

  @ApiProperty({ required: true })
  @ValidateNested()
  @Type(() => LocationDto)
  location: LocationDto;

  @ApiProperty({ required: true })
  @IsArray()
  @IsString({ each: true })
  @IsNotEmpty({ each: true })
  categories: string[];
}
