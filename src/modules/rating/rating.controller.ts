import { Body, Controller, Post, Request, UseGuards } from '@nestjs/common';
import { RatingService } from './rating.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RateHandymanDto } from './dto/rateHandyman.dto'
import { RolesGuard } from '../../guards/roles.guard';
import { Roles } from 'src/utils/decorators/roles.decorators';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';

@ApiTags('Rating')
@Controller('rating')
export class RatingController {
  constructor(private readonly ratingService: RatingService) {}

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('client')
  @ApiBearerAuth()
  @Post()
  async rateHandyman(@Body() rateHandymanDto: RateHandymanDto, @Request() req) {
    const { identifier, rating } = rateHandymanDto;
    const clientId = req.user.sub
    return this.ratingService.rateHandyman(clientId, identifier, rating);
  }
}