import {
  Body,
  Controller,
  Get,
  Param,
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

@ApiTags('Requests')
@Controller('requests')
export class RequestsController {
  constructor(private readonly requestsService: RequestsService) {}

  @Post('create-request')
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

  @Get(':id')
  async getRequestById(@Param('id') id: string) {
    return this.requestsService.getRequestById(id);
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
}
