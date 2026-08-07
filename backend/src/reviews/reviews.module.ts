import { Module } from '@nestjs/common';
import { ReviewsService } from './reviews.service';
import { ReviewsController } from './reviews.controller';
import { AdminReviewsController } from './admin-reviews.controller';
// import { PrismaModule } from '../prisma/prisma.module'; // Uncomment nếu PrismaService nằm trong PrismaModule

@Module({
  // imports: [PrismaModule], // Uncomment nếu dự án của bạn cần import PrismaModule
  controllers: [ReviewsController, AdminReviewsController],
  providers: [ReviewsService],
})
export class ReviewsModule {}