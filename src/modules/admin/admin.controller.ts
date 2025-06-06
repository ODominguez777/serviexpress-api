import {
  Controller,
  Patch,
  Param,
  Body,
  UseGuards,
  Delete,
  HttpCode,
  HttpStatus,
  Post,
  Inject,
  Get,
  Query,
} from '@nestjs/common';
import { AdminService } from './admin.service';
import { ApiResponse } from '../users/dto/response.dto';
import { BanUserDto } from '../users/dto/ban-user.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from 'src/guards/roles.guard';
import { ApiBearerAuth, ApiParam, ApiTags, ApiQuery } from '@nestjs/swagger';
import { Roles } from 'src/utils/decorators/roles.decorators';
import { BanUserParamDto } from './dto/ban-user-param.dto';
import { CHAT_ADAPTER } from '../chat/chat.constants';
import { ChatAdapter } from '../chat/adapter/chat.adapter';
@ApiTags('Admin')
@Controller('admin')
export class AdminController {
  constructor(
    private readonly adminService: AdminService,
    @Inject(CHAT_ADAPTER) private readonly chat: ChatAdapter,
  ) {}

  @Roles('admin')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard) // Solo accesible para administradores
  @ApiParam({ name: 'id', required: true, description: 'User ID' })
  @Patch('users/:id/ban')
  async banUser(@Param() params: BanUserParamDto): Promise<ApiResponse<any>> {
    return this.adminService.userBanManagment(params.id);
  }

  // @Roles('admin') // Solo accesible para administradores
  // @ApiBearerAuth()
  // @UseGuards(JwtAuthGuard, RolesGuard) // Solo accesible para administradores
  // @Delete('users/all')
  // @HttpCode(HttpStatus.NO_CONTENT)
  // async deleteAllUsersExceptAdmins(): Promise<void> {
  //   await this.adminService.deleteAllUsersExceptAdmins();
  // }

  @Post('create-admin-streamio')
  async createAdminStreamio(): Promise<ApiResponse<any>> {
    const adminStrmemio = await this.chat.createUserAdmin(
      '680f666ffb76d62d6ffa63bd',
      'Servi Express',
      'serviexpressrivas',
      'https://lh3.googleusercontent.com/a/ACg8ocJ1nT8Gggcuxq0anYgGbmTloPUiRgYFcYwy5gJAl_AUfPVMwWY=s360-c-no',
    );
    return new ApiResponse(200, 'Admin Streamio created successfully', null);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard) // Solo accesible para administradores
  @Roles('admin')
  @Get('getAllUsers')
  @ApiQuery({
    name: 'page',
    required: false,
    type: Number,
    description: 'Número de página (opcional, por defecto 1)',
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    type: Number,
    description: 'Cantidad de resultados por página (opcional, por defecto 10)',
  })
  async getAllUsers(
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 10,
  ): Promise<ApiResponse<any>> {
    const users = await this.adminService.getAllUsers(page, limit);
    return new ApiResponse(200, 'Users retrieved successfully', users);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard) // Solo accesible para administradores
  @Roles('admin')
  @Get('getAllReports')
  @ApiQuery({
    name: 'page',
    required: false,
    type: Number,
    description: 'Número de página (opcional, por defecto 1)',
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    type: Number,
    description: 'Cantidad de resultados por página (opcional, por defecto 10)',
  })
  async getAllReports(
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 10,
  ): Promise<ApiResponse<any>> {
    const reports = await this.adminService.getAllReports(page, limit);
    return new ApiResponse(200, 'Reports retrieved successfully', reports);
  }
}
