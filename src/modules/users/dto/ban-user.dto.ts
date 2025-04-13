import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean } from 'class-validator';

export class BanUserDto {
  @ApiProperty({ description: 'Indica si el usuario está baneado o no' })
  @IsBoolean()
  isBanned: boolean;
}