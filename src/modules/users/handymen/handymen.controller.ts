import { Controller, Get, Put, Param, Body, Request, UseGuards, Post, UnauthorizedException, BadRequestException } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { HandymenService } from './handymen.service';
import { JwtAuthGuard } from '../../auth/jwt-auth.guard';
import { Roles } from 'src/utils/decorators/roles.decorators'; 
import { RolesGuard } from 'src/guards/roles.guard';
import { UpdateHandymanDto } from './dto/update-handyman.dto';
import { ApiResponse } from '../dto/response.dto';
import { CreateHandymanDto } from './dto/create-handyman.dto';
import { UserRole } from '../enums/user-role.enum';
import { User } from '../common/schemas/user.schema';
import { isValidObjectId } from 'mongoose';

@ApiTags('Handymen')
@Controller('handymen')
export class HandymenController {
  constructor(private readonly handymenService: HandymenService) {}

  @Post('register-handyman')
  async registerHandyman(@Body() createHandymanDto: CreateHandymanDto) {
    createHandymanDto.role = UserRole.HANDYMAN;
    return this.handymenService.createUser(createHandymanDto);
  }
  
  @Get('get-all')
  async getAllHandymen() {
    return this.handymenService.findAllHandymen();
  }

  @ApiTags('Handymen')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('handyman')
  @ApiBearerAuth()
  @Put('update-handyman/:identifier')
  async updateHandymanByIdentifier(
    @Param('identifier') identifier: string,
    @Body() updateHandymanDto: UpdateHandymanDto,
    @Request() req: any,
  ) {
    return this.handleUpdate(identifier, updateHandymanDto, req.user.email, 'handyman');
  }

  private async handleUpdate(
    identifier: string,
    updateDto:  UpdateHandymanDto,
    authenticatedEmail: string,
    role: 'client' | 'handyman',
  ) {
    const isEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(identifier);

    if (isEmail) {
      if (authenticatedEmail !== identifier) {
        throw new UnauthorizedException(
          'You are not authorized to update this profile',
        );
      }

      return this.handymenService.updateUserByEmail(identifier, updateDto);
    } else {
      if (!isValidObjectId(identifier)) {
        throw new BadRequestException('Invalid ID format');
      }

      const user = await this.handymenService.findById(identifier);
      if (!user || user.email !== authenticatedEmail || user.role !== role) {
        throw new UnauthorizedException(
          'You are not authorized to update this profile',
        );
      }

      return this.handymenService.updateUserById(identifier, updateDto);
    }
  }


}