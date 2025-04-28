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
import { CreateQuotationDto } from './dto/create-quotations/create-quotation.dto';
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
  @Get('client/quotation/:requestId')
  async getQuotationByRequestId(
    @Param('requestId') requestId: string,
    @Request() req: any,
  ) {
    const sub = req.user.sub as string; // Obtener el ID del cliente desde el token JWT
    const clientId = new mongoose.Types.ObjectId(sub); // Obtener el ID del cliente desde el token JWT
    const newId = new mongoose.Types.ObjectId(requestId); // Convertir el id a ObjectId

    return this.requestsService.getQuotationByRequestId(newId, clientId);
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

  @Patch('client/accept-quotation/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('client')
  @ApiBearerAuth()
  async acceptQuotation(@Param('id') id: string, @Request() req: any) {
    const sub = req.user.sub as string; // Obtener el ID del cliente desde el token JWT

    const clientId = new mongoose.Types.ObjectId(sub); // Obtener el ID del cliente desde el token JWT

    const newId = new mongoose.Types.ObjectId(id); // Convertir el id a ObjectId
    return this.requestsService.acceptQuotation(newId, clientId);
  }

  @Patch('client/reject-quotation/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('client')
  @ApiBearerAuth()
  async rejectQuotation(@Param('id') id: string, @Request() req: any) {
    const sub = req.user.sub as string; // Obtener el ID del cliente desde el token JWT

    const clientId = new mongoose.Types.ObjectId(sub); // Obtener el ID del cliente desde el token JWT

    const newId = new mongoose.Types.ObjectId(id); // Convertir el id a ObjectId
    return this.requestsService.rejectQuotation(newId, clientId);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('handyman')
  @ApiBearerAuth()
  @Post('handyman/respond-request/:requestId')
  async respondToRequest(
    @Param('requestId') requestId: string,
    @Body() createQuotationDto: CreateQuotationDto,

    @Request() req: any,
  ) {
    const handymanId = req.user.sub; // Obtener el ID del handyman desde el token JWT
    return this.requestsService.createQuotation(
      handymanId,
      requestId,
      createQuotationDto,
    );
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
