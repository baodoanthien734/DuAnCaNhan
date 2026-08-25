import { Controller, Get, Param, Query } from '@nestjs/common';
import { ProductsService } from './services/products.service';

@Controller('products') 
export class PublicProductsController {
  constructor(private readonly productsService: ProductsService) {}

  @Get()
  async findAllPublic(
    @Query('q') q?: string,
    @Query('categoryId') categoryId?: string,
    @Query('skip') skip?: string,
    @Query('take') take?: string,
  ) {
    return this.productsService.findAllPublic({ q, categoryId, skip: skip ? Number(skip) : undefined, take: take ? Number(take) : undefined });
  }

  @Get(':slug') 
  async findOneBySlug(@Param('slug') slug: string) {
    return this.productsService.findOneBySlug(slug);
  }
}