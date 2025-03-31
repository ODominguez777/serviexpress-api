import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class CreateSkillDto {
    
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  skillName: string;

  @ApiProperty()
  @IsString()
  @IsOptional()
  description: string;
}
