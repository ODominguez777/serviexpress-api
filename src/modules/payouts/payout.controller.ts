import { Controller, Get, UseGuards, Req, Param } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags, ApiParam } from '@nestjs/swagger';
import { PayoutService } from './payout.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../../guards/roles.guard';
import { Roles } from 'src/utils/decorators/roles.decorators';

@ApiTags('Payouts')
@ApiBearerAuth()
@Controller('payouts')
export class PayoutController {
  constructor(private readonly payoutService: PayoutService) {}


  @ApiOperation({ summary: 'Obtener payout de un request específico del handyman autenticado' })
  @ApiParam({ name: 'requestId', description: 'ID del request' })
  @ApiResponse({ status: 200, description: 'Payout del handyman para el request.' })
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('handyman')
  @Get('handyman/request/:requestId')
  async findHandymanPayoutByRequest(@Req() req, @Param('requestId') requestId: string) {
    // handymanId desde el JWT
    const handymanId = req.user.sub;
    return this.payoutService.findHandymanPayoutByRequest(handymanId, requestId);
  }

  @ApiOperation({ summary: 'Obtener payout de un request específico del handyman autenticado' })
  @ApiParam({ name: 'requestId', description: 'ID del request' })
  @ApiResponse({ status: 200, description: 'Payout del handyman para el request.' })
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('client')
  @Get('client/request/:requestId')
  async findClientInvoiceByRequest(@Req() req, @Param('requestId') requestId: string) {
    // handymanId desde el JWT
    const clientId = req.user.sub;
    return this.payoutService.findClientInvoiceByRequestId(clientId, requestId);
  }
}