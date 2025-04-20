import { Controller, Patch, Param, Body, UseGuards, Delete, HttpCode, HttpStatus } from '@nestjs/common';
import { AdminService } from './admin.service';
import { ApiResponse } from '../users/dto/response.dto';
import { BanUserDto } from '../users/dto/ban-user.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from 'src/guards/roles.guard';
import { ApiBearerAuth, ApiParam, ApiTags } from '@nestjs/swagger';
import { Roles } from 'src/utils/decorators/roles.decorators';
import { BanUserParamDto } from './dto/ban-user-param.dto';

@ApiTags('Admin')
@Controller('admin')
@UseGuards(JwtAuthGuard, RolesGuard) // Solo accesible para administradores
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  @Roles('admin')
  @ApiBearerAuth()
  @ApiParam({ name: 'id', required: true, description: 'User ID' })
  @Patch('users/:id/ban')
  async banUser(
    @Param() params: BanUserParamDto,
  ): Promise<ApiResponse<any>> {
    return this.adminService.userBanManagment(params.id);
  }

  @Roles('admin') // Solo accesible para administradores
  @ApiBearerAuth()
  @Delete('users/all')
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteAllUsersExceptAdmins(): Promise<void> {
    await this.adminService.deleteAllUsersExceptAdmins();
  }
}
