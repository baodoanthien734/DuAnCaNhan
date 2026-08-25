import { Module } from '@nestjs/common';
import { ProductsService } from './services/products.service';
import { ProductsController } from './products.controller';
import { ProductCustomizationsService } from './services/product-customizations.service'; // Import service
import { PublicProductsController } from './public-products.controller';

@Module({
  controllers: [ProductsController, PublicProductsController],
  providers: [
    ProductsService,
    ProductCustomizationsService
  ],
})
export class ProductsModule {}