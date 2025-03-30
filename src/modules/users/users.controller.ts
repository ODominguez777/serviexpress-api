import {
  Controller,
  Post,
  Get,
  Body,
  Query,
  Param,
  NotFoundException,
  InternalServerErrorException,
} from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { UsersService } from './users.service';
import { CreateUserDto } from './dto/create-user.dto';
import { User } from './schemas/user.schema';
import { ApiResponse } from './dto/response.dto';

@ApiTags('Users')
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Post('register')
  @ApiOperation({ summary: 'Register a new user' })
  async register(@Body() createUserDto: CreateUserDto): Promise<User> {
    return this.usersService.createUser(createUserDto);
  }

  @Get('handymen')
  async getAllHandymen(
    @Query('page') page: number = 1, // Paginación: número de página
    @Query('limit') limit: number = 10, // Paginación: límite de resultados
  ) {
    const result = await this.usersService.findAllHandymen(page, limit);
    return result;
  }

  @Get('handyman/email/:email')
  async getHandymanByEmail(
    @Param('email') email: string,
  ): Promise<ApiResponse<any>> {
    try {
      const handyman = await this.usersService.getHandymanByEmail(email);
      return new ApiResponse(200, 'Handyman found', handyman);
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw new NotFoundException('Handyman not found');
      }
      throw new InternalServerErrorException(
        'Something went wrong while fetching handyman',
      );
    }
  }

  @Get('client/email/:email')
  async getClientByEmail(
    @Param('email') email: string,
  ): Promise<ApiResponse<any>> {
    try {
      const client = await this.usersService.getClientByEmail(email);
      return new ApiResponse(200, 'Client found', client);
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw new NotFoundException('Client not found');
      }
      throw new InternalServerErrorException(
        'Something went wrong while fetching client',
      );
    }
  }
}
