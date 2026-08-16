import { Controller, Get, Param, Patch, Body, Query, UseGuards, ParseIntPipe } from '@nestjs/common';
import { OrdersService } from './orders.service';
import { UpdateOrderStatusDto } from './dto/update-order-status.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { OrderStatus } from '@prisma/client';

@Controller('admin/orders')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN')
export class AdminOrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  @Get()
  async findAll(
    @Query('status') status?: OrderStatus, 
    @Query('skip') skip?: string, 
    @Query('take') take?: string,
    @Query('q') q?: string,                  
    @Query('dateRange') dateRange?: string    
  ) {
    return this.ordersService.findAllForAdmin({
      status,
      q,                                      
      dateRange,                              
      skip: skip ? Number(skip) : undefined,
      take: take ? Number(take) : undefined,
    });
  }

  @Get(':id')
  async findOne(@Param('id', ParseIntPipe) id: number) {
    return this.ordersService.findOneForAdmin(id);
  }

  @Patch(':id/status')
  async updateStatus(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateOrderStatusDto) {
    return this.ordersService.updateStatus(id, dto.status);
  }
}