import { Controller, Get, Post, Body, Param, Put, Delete, Query, UseGuards, UseInterceptors, UploadedFile } from '@nestjs/common';
import { CategoriesService } from './categories.service';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';

@Controller('admin/categories')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN')
export class CategoriesController {
  constructor(private readonly categoriesService: CategoriesService) {}

  @Get()
  async findAll(@Query('q') q: string, @Query('parentId') parentId: string, @Query('skip') skip: string, @Query('take') take: string) {
    const res = await this.categoriesService.findAll({ 
      q, 
      parentId: parentId ? Number(parentId) : undefined, 
      skip: skip ? Number(skip) : undefined, 
      take: take ? Number(take) : undefined 
    });
    return res;
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    return this.categoriesService.findOne(Number(id));
  }

  @Post()
  @UseInterceptors(FileInterceptor('image', { storage: memoryStorage() }))
  async create(
    @Body() dto: CreateCategoryDto, 
    @UploadedFile() file?: Express.Multer.File
  ) {
    return this.categoriesService.create(dto, file);
  }

  @Put(':id')
  @UseInterceptors(FileInterceptor('image', { storage: memoryStorage() }))
  async update(
    @Param('id') id: string, 
    @Body() dto: UpdateCategoryDto,
    @UploadedFile() file?: Express.Multer.File
  ) {
    return this.categoriesService.update(Number(id), dto, file);
  }

  @Delete(':id')
  async remove(@Param('id') id: string) {
    return this.categoriesService.remove(Number(id));
  }

  @Post('reorder')
  async reorder(@Body() updates: { id: number; position: number }[]) {
    return this.categoriesService.reorder(updates);
  }
}