import { Controller, Post, Get, Body, Param, Query, UseGuards, Req, Patch, Delete } from '@nestjs/common';
import { ReviewsService } from './reviews.service';
import { CreateReviewDto } from './dto/create-review.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard'; 
import { UpdateReviewDto } from './dto/update-review.dto';

@Controller('reviews')
export class ReviewsController {
  constructor(private readonly reviewsService: ReviewsService) {}

  // User đăng đánh giá
  @Post()
  @UseGuards(JwtAuthGuard)
  create(@Req() req: any, @Body() createReviewDto: CreateReviewDto) {
    const userId = Number(req.user.id || req.user.sub);
    return this.reviewsService.create(userId, createReviewDto);
  }

  // Public xem đánh giá của 1 sản phẩm
  @Get('product/:productId')
  findAllByProduct(
    @Param('productId') productId: string,
    @Query() query: { skip?: number; take?: number }
  ) {
    return this.reviewsService.findAllByProduct(Number(productId), query);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard)
  update(@Req() req: any, @Param('id') id: string, @Body() dto: UpdateReviewDto) {
    const userId = Number(req.user.id || req.user.sub);
    return this.reviewsService.update(userId, Number(id), dto);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  removeByUser(@Req() req: any, @Param('id') id: string) {
    const userId = Number(req.user.id || req.user.sub);
    return this.reviewsService.removeByUser(userId, Number(id));
  }
}