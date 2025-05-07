import { Controller, Get, Param, Post, Body } from '@nestjs/common';
import { PayoutService } from './payout.service';

@Controller('payouts')
export class PayoutController {
  constructor(private readonly payoutService: PayoutService) {}

  @Post()
  async create(@Body() data: any) {
    return this.payoutService.createPayout(data);
  }

  @Get()
  async findAll() {
    return this.payoutService.findAll();
  }

  @Get('handyman/:handymanId')
  async findByHandyman(@Param('handymanId') handymanId: string) {
    return this.payoutService.findByHandyman(handymanId);
  }

  @Get(':id')
  async findById(@Param('id') id: string) {
    return this.payoutService.findById(id);
  }
}