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
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { UsersService } from './users.service';
import { CreateUserDto } from './dto/create-user.dto';
import { ApiResponse } from './dto/response.dto';
import { FindHandymenDto } from './dto/find-handyman.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { UpdateUserDto } from './dto/update-user.dto';

@ApiTags('Users')
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Post('register')
  @ApiOperation({ summary: 'Register a new user' })
  async register(
    @Body() createUserDto: CreateUserDto,
  ): Promise<ApiResponse<any>> {
    
    return this.usersService.createUser(createUserDto);
  }

  @Get('handymen')
  async getAllHandymen(@Query() query: FindHandymenDto) {
    const result = await this.usersService.findAllHandymen(
      query.page,
      query.limit,
      query.skills,
      query.coverageArea,
    );
    return result;
  }

  // @UseGuards(JwtAuthGuard)
  // @ApiBearerAuth()
  // @Get('handyman/email/:email')
  // async getHandymanByEmail(
  //   @Param('email') email: string,
  // ): Promise<ApiResponse<any>> {
  //   try {
  //     const handyman = await this.usersService.getHandymanByEmail(email);
  //     return new ApiResponse(200, 'Handyman found', handyman);
  //   } catch (error) {
  //     if (error instanceof NotFoundException) {
  //       throw new NotFoundException('Handyman not found');
  //     }
  //     throw new InternalServerErrorException(
  //       'Something went wrong while fetching handyman',
  //     );
  //   }
  // }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Get('/:email')
  async getUserByEmail(
    @Param('email') email: string,
  ): Promise<ApiResponse<any>> {
    try {
      const client = await this.usersService.getUserByEmail(email);
      return new ApiResponse(200, 'User found', client);
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw new NotFoundException('User not found');
      }
      throw new InternalServerErrorException(
        'Something went wrong while fetching user',
      );
    }
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Put('update/:email')
  async updateUser(
    @Param('email') email: string,
    @Body() updateUserDto: UpdateUserDto,
    @Request() req: any,
  ): Promise<ApiResponse<any>> {
    const authenticatedEmail = req.user.email
    const authenticatedRole = req.user.role; 
    if (authenticatedEmail !== email) {
      throw new UnauthorizedException(
        'You are not authorized to update this user',
      );
    }
    try {
      const user = await this.usersService.updateUser(email,authenticatedRole, updateUserDto);
      return new ApiResponse(200, 'User updated successfully', user);
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      if(error instanceof UnauthorizedException) {
        throw error;
      }
      console.error('Error updating user:', error);
      throw new InternalServerErrorException('An unexpected error occurred');
    }
  }
}
