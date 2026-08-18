import { Controller, Get, Post, Body, UseGuards, Req, Param, Patch } from '@nestjs/common';
import { OrdersService } from './orders.service';
import { CheckoutDto } from './dto/checkout.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('orders')
@UseGuards(JwtAuthGuard)
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  @Post('checkout')
  async checkout(@Req() req: any, @Body() dto: CheckoutDto) {
    const userId = Number(req.user.id || req.user.sub);
    return this.ordersService.checkout(userId, dto);
  }

  @Get()
  async findMyOrders(@Req() req: any) {
    const userId = Number(req.user.id || req.user.sub);
    return this.ordersService.findMyOrders(userId);
  }

  @Get(':id')
  async findOneMyOrder(@Req() req: any, @Param('id') id: string) {
    const userId = Number(req.user.id || req.user.sub);
    return this.ordersService.findOneMyOrder(userId, Number(id));
  }

  // --- THÊM ROUTE NÀY ---
  @Patch(':id/cancel')
  async cancelMyOrder(@Req() req: any, @Param('id') id: string) {
    const userId = Number(req.user.id || req.user.sub);
    return this.ordersService.cancelOrder(userId, Number(id));
  }
}