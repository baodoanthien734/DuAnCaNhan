import { Module } from '@nestjs/common';
import { ProductsService } from './services/products.service';
import { ProductsController } from './products.controller';
import { ProductVariantsService } from './services/product-variants.service'; // Import service
import { ProductCustomizationsService } from './services/product-customizations.service'; // Import service

@Module({
  controllers: [ProductsController],
  providers: [
    ProductsService,
    ProductVariantsService, 
    ProductCustomizationsService
  ],
  // Nếu có PrismaService, bạn sẽ import vào providers ở các bước sau
})
export class ProductsModule {}