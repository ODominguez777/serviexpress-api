import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsOptional, IsArray } from 'class-validator';
import { Types } from 'mongoose';

export class UpdateHandymanDto {
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
  personalDescription?: string;

  @ApiProperty({ type: [String], required: false })
  @IsOptional()
  @IsArray()
  skills?: Types.ObjectId[];

  @ApiProperty({ type: [String], required: false })
  @IsOptional()
  @IsArray()
  coverageArea?: string[];
}