import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Request,
  UseGuards,
} from '@nestjs/common';
import { RequestsService } from './requests.service';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { CreateRequestDto } from './dto/create-request/create-request.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from 'src/guards/roles.guard';
import { Roles } from 'src/utils/decorators/roles.decorators';
import mongoose, { ObjectId } from 'mongoose';

@ApiTags('Requests')
@Controller('requests')
export class RequestsController {
  constructor(private readonly requestsService: RequestsService) {}

  @Post('client/create-request')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('client')
  @ApiBearerAuth()
  async createRequest(
    @Body() createRequestDto: CreateRequestDto,
    @Request() req: any,
  ) {
    const clientId = req.user.sub; // Obtener el ID del cliente desde el token JWT
    return this.requestsService.createRequest(clientId, createRequestDto);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('client')
  @ApiBearerAuth()
  @Get('client/my-requests')
  async getClientRequests(@Request() req: any) {
    const clientId = req.user.sub; // Obtener el ID del cliente desde el token JWT
    return this.requestsService.getClientRequests(clientId);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('client')
  @ApiBearerAuth()
  @Get('client/request-handyman/:handymanId')
  async getRequestHandymanById(
    @Param('handymanId') handymanId: string,
    @Request() req: any,
  ) {
    const sub = req.user.sub as string;
    const clientId = new mongoose.Types.ObjectId(sub);
    const newId = new mongoose.Types.ObjectId(handymanId); // Convertir el id a ObjectId
    return this.requestsService.getActiveRequestByHandymanId(clientId, newId);
  }

  @Patch('client/cancel-request/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('client')
  @ApiBearerAuth()
  async cancelRequest(@Param('id') id: string, @Request() req: any) {
    const sub = req.user.sub as string; // Obtener el ID del cliente desde el token JWT
    const clientId = new mongoose.Types.ObjectId(sub); // Obtener el ID del cliente desde el token JWT

    const newId = new mongoose.Types.ObjectId(id); // Convertir el id a ObjectId
    return this.requestsService.cancelRequest(newId, clientId);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('handyman')
  @ApiBearerAuth()
  @Get('handyman/my-requests')
  async getHandymanRequests(@Request() req: any) {
    const handymanId = req.user.sub; // Obtener el ID del cliente desde el token JWT
    return this.requestsService.getClientRequests(handymanId);
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Get(':id')
  async getRequestById(@Param('id') id: string) {
    return this.requestsService.getRequestById(id);
  }
}
