import {
  Controller,
  Get,
  Param,
  NotFoundException,
  InternalServerErrorException,
  UseGuards,
  Request,
  BadRequestException,
  Headers,
  Query,
  Post,
  Body,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiHeader } from '@nestjs/swagger';
import { UsersService } from './users.service';
import { ApiResponse } from '../dto/response.dto';
import { JwtAuthGuard } from '../../auth/jwt-auth.guard';
import { isValidObjectId } from 'mongoose';
import { isEmail } from 'class-validator';
import * as jwt from 'jsonwebtoken';
import { th } from '@faker-js/faker/.';
import { CreateReportDto } from './dto/create-report.dto';

@ApiTags('Users')
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @ApiTags('Users')
  @ApiHeader({
    name: 'x-jwt-token',
    description: 'JWT directo sin Bearer (opcional)',
    required: false,
  })
  @Get('get-any-user/:identifier')
  async getUserByIdentifier(
    @Param('identifier') identifier: string,
    @Headers('x-jwt-token') jwtToken?: string,
  ): Promise<ApiResponse<any>> {
    let user;
    let userActiveId;
    let role;
    if (jwtToken) {
      try {
        const payload: any = jwt.verify(jwtToken, process.env.JWT_SECRET!);
        userActiveId = payload.sub;
        role = payload.role;
      } catch (err) {
        throw new InternalServerErrorException('Invalid token');
      }
    }

    // Verificar si el identificador es un ObjectId válido
    if (isValidObjectId(identifier)) {
      if (jwtToken) {
        user = await this.usersService.findById(
          identifier,
          true,
          userActiveId,
          role,
        );
      } else {
        user = await this.usersService.findById(identifier, true);
      }

      if (user.role === 'admin') {
        throw new BadRequestException('Cannot get admin user');
      }
    }
    // Verificar si el identificador es un email válido
    else if (isEmail(identifier)) {
      if (jwtToken) {
        user = await this.usersService.getUserByEmail(
          identifier,
          true,
          userActiveId,
          role,
        );
      } else {
        user = await this.usersService.getUserByEmail(identifier, true);
      }
      if (user.role === 'admin') {
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
    const user = await this.usersService.getUserByEmail(
      authenticatedEmail,
      true,
    );

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return new ApiResponse(200, 'User profile retrieved successfully', user);
  }

  @ApiTags('Users')
  @Get('search-handyman')
  async searchHandyman(@Query('q') query: string): Promise<ApiResponse<any>> {
    const handymen = await this.usersService.searchHandymen(query);
    return new ApiResponse(200, 'Handymen found', handymen);
  }

 @ApiTags('Users')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Post('create-report')
async createReport(
  @Request() req: any,
  @Body() createReportDto: CreateReportDto,
): Promise<ApiResponse<any>> {
  const reporterUserId = req.user.sub;
  const reporterRole = req.user.role;
  const { reportedUserId, title, description } = createReportDto;

  const report = await this.usersService.createReport(
    reporterUserId,
    reportedUserId,
    title,
    description,
    reporterRole,
  );

  if (!report) {
    throw new NotFoundException('Report not found');
  }

  return new ApiResponse(200, 'Report created successfully', report);
}
}
