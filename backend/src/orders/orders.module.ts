import { Module } from '@nestjs/common';
import { OrdersService } from './orders.service';
import { OrdersController } from './orders.controller';
import { AdminOrdersController } from './admin-orders.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { CartModule } from '../cart/cart.module'; // Phải import CartModule để lấy Service

@Module({
  imports: [PrismaModule, CartModule],
  controllers: [OrdersController, AdminOrdersController],
  providers: [OrdersService],
})
export class OrdersModule {}