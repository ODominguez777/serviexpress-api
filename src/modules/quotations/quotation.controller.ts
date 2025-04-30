import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Put,
  Request,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from 'src/guards/roles.guard';
import { Roles } from 'src/utils/decorators/roles.decorators';
import { CreateQuotationDto } from './dto/create-quotation.dto';
import mongoose from 'mongoose';
import { QuotationService } from './quotation.service';

@ApiTags('Quotations')
@Controller('quotations')
export class QuotationController {
  constructor(private readonly quotationService: QuotationService) {}

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('handyman')
  @ApiBearerAuth()
  @Post('handyman/create-quotation/:requestId')
  async createQuotation(
    @Param('requestId') requestId: string,
    @Body() createQuotationDto: CreateQuotationDto,

    @Request() req: any,
  ) {
    const handymanId = req.user.sub; // Obtener el ID del handyman desde el token JWT
    return this.quotationService.createQuotation(
      handymanId,
      requestId,
      createQuotationDto,
    );
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

    return this.quotationService.getQuotationByRequestId(newId, clientId);
  }

  @Patch('client/accept-quotation/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('client')
  @ApiBearerAuth()
  async acceptQuotation(@Param('id') id: string, @Request() req: any) {
    const sub = req.user.sub as string; // Obtener el ID del cliente desde el token JWT

    const clientId = new mongoose.Types.ObjectId(sub); // Obtener el ID del cliente desde el token JWT

    const newId = new mongoose.Types.ObjectId(id); // Convertir el id a ObjectId
    return this.quotationService.acceptQuotation(newId, clientId);
  }

  @Patch('client/reject-quotation/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('client')
  @ApiBearerAuth()
  async rejectQuotation(@Param('id') id: string, @Request() req: any) {
    const sub = req.user.sub as string; // Obtener el ID del cliente desde el token JWT

    const clientId = new mongoose.Types.ObjectId(sub); // Obtener el ID del cliente desde el token JWT

    const newId = new mongoose.Types.ObjectId(id); // Convertir el id a ObjectId
    return this.quotationService.rejectQuotation(newId, clientId);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('handyman')
  @ApiBearerAuth()
  @Put('handyman/update-quotation/:id')
  async updateQuotation(
    @Param('id') id: string,
    @Body() createQuotationDto: CreateQuotationDto,
    @Request() req: any,
  ) {
    const handymanId = req.user.sub; // Obtener el ID del handyman desde el token JWT // Convertir el id a ObjectId
    return this.quotationService.updateQuotation(
      id,
      handymanId,
      createQuotationDto,
    );
  }
}
