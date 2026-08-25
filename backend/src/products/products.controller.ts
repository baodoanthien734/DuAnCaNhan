import { Controller, Get, Post, Body, Query, Param, Patch, Delete, UseGuards } from '@nestjs/common';
import { ProductsService } from './services/products.service';
import { CreateProductDto } from './dto/core/create-product.dto';
import { FilterProductDto } from './dto/core/filter-product.dto';
import { UpdateProductDto } from './dto/core/update-product.dto';
import { BulkUpdateProductDto } from './dto/core/bulk-update-product.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '@/auth/decorators/roles.decorator';

@Controller('admin/products')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN') 
export class ProductsController {
  constructor(private readonly productsService: ProductsService) {}

  @Post()
  async create(@Body() createProductDto: CreateProductDto) {
    return this.productsService.create(createProductDto);
  }

  @Get()
  findAll(@Query() query: FilterProductDto) { 
    return this.productsService.findAll(query);
  }

  @Patch('bulk')
  bulkUpdate(@Body() bulkDto: BulkUpdateProductDto) {
    return this.productsService.bulkUpdate(bulkDto);
  }

  @Patch(':id/status')
  updateStatus(@Param('id') id: string, @Body('status') status: string) {
    return this.productsService.updateStatus(Number(id), status);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.productsService.remove(Number(id));
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.productsService.findOne(Number(id));
  }

  @Patch(':id')
  update(
    @Param('id') id: string, 
    @Body() updateProductDto: UpdateProductDto
  ) {
    return this.productsService.update(Number(id), updateProductDto);
  }
}