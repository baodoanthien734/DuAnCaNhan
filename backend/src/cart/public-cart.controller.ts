import { Controller, Post, Body } from '@nestjs/common';
import { CartService } from './cart.service';

@Controller('public/cart')
export class PublicCartController {
  constructor(private readonly cartService: CartService) {}

  @Post('validate')
  async validateCart(@Body('items') items: any[]) {
    return this.cartService.validateGuestCart(items || []);
  }
}