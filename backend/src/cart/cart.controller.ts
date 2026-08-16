import { Controller, Get, Post, Patch, Delete, Body, Param, ParseIntPipe, UseGuards, Req } from '@nestjs/common';
import { CartService } from './cart.service';
import { AddCartItemDto } from './dto/add-cart-item.dto';
import { UpdateCartItemDto } from './dto/update-cart-item.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard'; // Đảm bảo đường dẫn này đúng với dự án của bạn

@Controller('cart')
@UseGuards(JwtAuthGuard)
export class CartController {
  constructor(private readonly cartService: CartService) {}

  @Get()
  async getCart(@Req() req: any) {
    // Lấy userId từ JWT token đã được giải mã
    const userId = Number(req.user.id || req.user.sub);
    return this.cartService.getCart(userId);
  }

  @Post('items')
  async addItem(@Req() req: any, @Body() dto: AddCartItemDto) {
    const userId = Number(req.user.id || req.user.sub);
    return this.cartService.addItem(userId, dto);
  }

  @Patch('items/:id')
  async updateItem(
    @Req() req: any,
    @Param('id', ParseIntPipe) itemId: number,
    @Body() dto: UpdateCartItemDto,
  ) {
    const userId = Number(req.user.id || req.user.sub);
    return this.cartService.updateItem(userId, itemId, dto);
  }

  @Delete('items/:id')
  async removeItem(@Req() req: any, @Param('id', ParseIntPipe) itemId: number) {
    const userId = Number(req.user.id || req.user.sub);
    return this.cartService.removeItem(userId, itemId);
  }
}