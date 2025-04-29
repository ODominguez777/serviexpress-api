import {
  Controller,
  Get,
  Param,
  NotFoundException,
  InternalServerErrorException,
  UseGuards,
  Request,
  BadRequestException,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { UsersService } from './users.service';
import { ApiResponse } from '../dto/response.dto';
import { JwtAuthGuard } from '../../auth/jwt-auth.guard';
import { isValidObjectId } from 'mongoose';
import { isEmail } from 'class-validator';

@ApiTags('Users')
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @ApiTags('Users')
  @Get('get-any-user/:identifier')
  async getUserByIdentifier(
    @Param('identifier') identifier: string,
  ): Promise<ApiResponse<any>> {
    let user;


    // Verificar si el identificador es un ObjectId válido
    if (isValidObjectId(identifier)) {
      user = await this.usersService.findById(identifier, true); // Buscar por ID

      if(user.role === 'admin'){
        throw new BadRequestException('Cannot get admin user');
      }

    }
    // Verificar si el identificador es un email válido
    else if (isEmail(identifier)) {
      user = await this.usersService.getUserByEmail(identifier, true); // Excluir el _id
      if(user.role === 'admin'){
        throw new BadRequestException('Cannot get admin user');
      }

    } else {
      throw new BadRequestException(
        'Identifier must be a valid ObjectId or email',
      );
    }

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return new ApiResponse(200, 'User found', user);
  }


  @ApiTags('Users')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Get('profile')
  async getProfile(@Request() req: any): Promise<ApiResponse<any>> {
    const authenticatedEmail = req.user.email;

    // Obtener los datos del usuario autenticado con el _id incluido
    const user = await this.usersService.getUserByEmail(authenticatedEmail, true);

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return new ApiResponse(200, 'User profile retrieved successfully', user);
  }
}
