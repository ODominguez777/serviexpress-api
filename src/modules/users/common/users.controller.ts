import {
  Controller,
  Post,
  Get,
  Body,
  Query,
  Param,
  NotFoundException,
  InternalServerErrorException,
  UseGuards,
  Put,
  Request,
  UnauthorizedException,
  BadRequestException,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiExcludeController } from '@nestjs/swagger';
import { UsersService } from './users.service';
import { CreateUserDto } from './dto/create-user.dto';
import { CreateClientDto } from '../clients/dto/create-client.dto';
import { CreateHandymanDto } from '../handymen/dto/create-handyman.dto';
import { ApiResponse } from '../dto/response.dto';
import { FindHandymenDto } from '../handymen/dto/find-handyman.dto';
import { JwtAuthGuard } from '../../auth/jwt-auth.guard';
import { UpdateUserDto } from './dto/update-user.dto';
import { UpdateClientDto } from '../clients/dto/update-client.dto';
import { UpdateHandymanDto } from '../handymen/dto/update-handyman.dto';
import { UserRole } from '../enums/user-role.enum';
import { isValidObjectId } from 'mongoose';
import { Roles } from 'src/utils/decorators/roles.decorators';
import { RolesGuard } from 'src/guards/roles.guard';

@ApiTags('Users')
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}
  
  @ApiTags('Users')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Get('get-any-user/:email')
  async getUserByEmail(
    @Param('email') email: string,
  ): Promise<ApiResponse<any>> {
    try {
      const user = await this.usersService.getUserByEmail(email);
      return new ApiResponse(200, 'User found', user);
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw new NotFoundException('User not found');
      }
      throw new InternalServerErrorException(
        'Something went wrong while fetching the user',
      );
    }
  }

  @ApiTags('Users')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Get('profile')
  async getProfile(@Request() req: any): Promise<ApiResponse<any>> {
    const authenticatedEmail = req.user.email;

    // Obtener los datos del usuario autenticado
    const user = await this.usersService.getUserByEmail(authenticatedEmail);

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return new ApiResponse(200, 'User profile retrieved successfully', user);
  }

 

 
}
