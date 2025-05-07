import {
  Controller,
  Put,
  Param,
  Body,
  Request,
  UseGuards,
  Post,
  Get,
  UnauthorizedException,
  BadRequestException,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { ClientsService } from './clients.service';
import { JwtAuthGuard } from '../../auth/jwt-auth.guard';
import { Roles } from 'src/utils/decorators/roles.decorators';
import { RolesGuard } from 'src/guards/roles.guard';
import { UpdateClientDto } from './dto/update-client.dto';
import { CreateClientDto } from './dto/create-client.dto';
import { UserRole } from '../enums/user-role.enum';
import { isValidObjectId } from 'mongoose';
import { isEmail } from 'class-validator';
import { get } from 'http';
import { ChangeToHandymanDto } from './dto/change-to-handyman.dto';

@ApiTags('Clients')
@Controller('clients')
export class ClientsController {
  constructor(private readonly clientsService: ClientsService) {}

  @Post('register-client')
  async registerClient(@Body() createClientDto: CreateClientDto) {
    createClientDto.role = UserRole.CLIENT;
    return this.clientsService.createUser(createClientDto);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('client')
  @ApiBearerAuth()
  @Put('update-client/:identifier')
  async updateClientByIdentifier(
    @Param('identifier') identifier: string,
    @Body() UpdateClientDto: UpdateClientDto,
    @Request() req: any,
  ) {
    return this.handleUpdate(
      identifier,
      UpdateClientDto,
      req.user.email,
      'client',
    );
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('client')
  @ApiBearerAuth()
  @Put('change-to-handyman')
  async changeToHandyman(
    @Request() req: any,
    @Body() changeToHandyman: ChangeToHandymanDto,
  ) {
    const clientId = req.user.sub;
    return this.clientsService.changeToHandyman(clientId, changeToHandyman);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('client')
  @ApiBearerAuth()
  @Get('/rates')
  async getClientRates(@Request() req: any) {
    return this.clientsService.getClientRates(req.user.sub);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('client')
  @ApiBearerAuth()
  @Get('/rates/:handymanId')
  async getIndividualRate(
    @Param('handymanId') handymanId: string,
    @Request() req: any,
  ) {
    const clientId = req.user.sub;
    return this.clientsService.getIndividualRate(clientId, handymanId);
  }

  private async handleUpdate(
    identifier: string,
    updateDto: UpdateClientDto,
    authenticatedEmail: string,
    role: 'client',
  ) {
    const isEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(identifier);

    if (isEmail) {
      if (authenticatedEmail !== identifier) {
        throw new UnauthorizedException(
          'You are not authorized to update this profile',
        );
      }

      return this.clientsService.updateUserByEmail(identifier, updateDto);
    } else {
      if (!isValidObjectId(identifier)) {
        throw new BadRequestException('Invalid ID format');
      }

      const user = await this.clientsService.findById(identifier);
      if (!user || user.email !== authenticatedEmail || user.role !== role) {
        throw new UnauthorizedException(
          'You are not authorized to update this profile',
        );
      }

      return this.clientsService.updateUserById(identifier, updateDto);
    }
  }
}
