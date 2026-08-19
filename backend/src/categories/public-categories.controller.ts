import { Controller, Get, Param } from '@nestjs/common';
import { CategoriesService } from './categories.service';

@Controller('categories') // Route sẽ là /categories (không có chữ admin)
export class PublicCategoriesController {
  constructor(private readonly categoriesService: CategoriesService) {}

  @Get()
  async findAllPublic() {
    return this.categoriesService.findAllPublic();
  }

  @Get(':slug')
  async findOneBySlugPublic(@Param('slug') slug: string) {
    return this.categoriesService.findOneBySlugPublic(slug);
  }
}