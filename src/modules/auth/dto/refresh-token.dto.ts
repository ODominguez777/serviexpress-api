import { ApiProperty } from '@nestjs/swagger';
import { IsString } from 'class-validator';

export class RefreshTokenDto {
  @ApiProperty({
    description: 'The refresh token used to generate a new access token',
    example: 'some-random-refresh-token',
  })
  @IsString()
  refreshToken: string;
}