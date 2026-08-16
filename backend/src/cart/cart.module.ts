import { Module } from '@nestjs/common';
import { CartService } from './cart.service';
import { CartController } from './cart.controller';
import { PublicCartController } from './public-cart.controller'; // <--- IMPORT MỚI
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [CartController, PublicCartController], // <--- THÊM VÀO ĐÂY
  providers: [CartService],
  exports: [CartService],
})
export class CartModule {}