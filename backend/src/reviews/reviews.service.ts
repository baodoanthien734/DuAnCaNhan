import { Injectable, BadRequestException, NotFoundException, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateReviewDto } from './dto/create-review.dto';
import { ReplyReviewDto } from './dto/reply-review.dto';
import { UpdateReviewDto } from './dto/update-review.dto';
import { I18nService } from 'nestjs-i18n';
import * as fs from 'fs';
import { resolve } from 'path';

@Injectable()
export class ReviewsService {
  private readonly logger = new Logger(ReviewsService.name);
  private readonly publicRootDir = resolve(process.cwd(), 'public');
  private readonly reviewsRootDir = resolve(process.cwd(), 'public', 'uploads', 'reviews');

  constructor(
    private readonly prisma: PrismaService,
    private readonly i18n: I18nService
  ) {}

  private resolveReviewImageFilePath(imageUrl: string): string | null {
    if (!imageUrl) return null;

    let pathname = imageUrl.trim();

    try {
      if (/^https?:\/\//i.test(pathname)) {
        pathname = new URL(pathname).pathname;
      }
    } catch {
      return null;
    }

    pathname = pathname.split('?')[0].replace(/^\/+/, '');
    if (!pathname.startsWith('uploads/reviews/')) {
      return null;
    }

    const absolutePath = resolve(this.publicRootDir, pathname);
    if (!absolutePath.startsWith(this.reviewsRootDir)) {
      return null;
    }

    return absolutePath;
  }

  private cleanupReviewImages(imageUrls: string[]) {
    if (!Array.isArray(imageUrls) || imageUrls.length === 0) return;

    for (const imageUrl of imageUrls) {
      try {
        const filePath = this.resolveReviewImageFilePath(imageUrl);
        if (!filePath) continue;
        if (!fs.existsSync(filePath)) continue;

        fs.unlinkSync(filePath);
        this.logger.log(`Deleted orphan review image: ${filePath}`);
      } catch {
        this.logger.warn(`Failed to delete review image: ${imageUrl}`);
      }
    }
  }

  // 1. NGƯỜI DÙNG TẠO ĐÁNH GIÁ
  async create(userId: number, dto: CreateReviewDto) {
    // Kiểm tra xem User có thực sự đã mua sản phẩm này trong đơn hàng đó và đã nhận hàng chưa
    const validOrder = await this.prisma.order.findFirst({
      where: {
        id: dto.orderId,
        customerId: userId,
        status: 'DELIVERED', // Bắt buộc phải nhận hàng xong mới được đánh giá
        items: {
          some: { productId: dto.productId }
        }
      }
    });

    if (!validOrder) {
      throw new BadRequestException(await this.i18n.translate('reviews.error.not_eligible'));
    }

    // Kiểm tra xem đã đánh giá cho đơn hàng này chưa (Mỗi SP trong 1 đơn chỉ đánh giá 1 lần)
    const existingReview = await this.prisma.review.findFirst({
      where: {
        customerId: userId,
        orderId: dto.orderId,
        productId: dto.productId
      }
    });

    if (existingReview) {
      throw new BadRequestException(await this.i18n.translate('reviews.error.already_reviewed'));
    }

    // Tạo đánh giá
    const review = await this.prisma.review.create({
      data: {
        customerId: userId,
        productId: dto.productId,
        orderId: dto.orderId,
        rating: dto.rating,
        comment: dto.comment,
        images: dto.images || [],
      }
    });

    return {
      success: true,
      message: await this.i18n.translate('reviews.success.created'),
      data: review
    };
  }
    // Cập nhật đánh giá
    async update(userId: number, reviewId: number, dto: UpdateReviewDto) {
    const review = await this.prisma.review.findUnique({ where: { id: reviewId } });
    if (!review) throw new NotFoundException(await this.i18n.translate('reviews.error.not_found'));

    if (review.customerId !== userId) {
        throw new BadRequestException(await this.i18n.translate('reviews.error.unauthorized'));
    }

    const nextImages = dto.images !== undefined ? dto.images : review.images;

    const updated = await this.prisma.review.update({
        where: { id: reviewId },
        data: {
        rating: dto.rating ?? review.rating,
        comment: dto.comment !== undefined ? dto.comment : review.comment,
      images: nextImages,
        },
    });

    const removedImages = (review.images || []).filter((img) => !(nextImages || []).includes(img));
    this.cleanupReviewImages(removedImages);

    return {
        success: true,
        message: await this.i18n.translate('reviews.success.updated'),
        data: updated,
    };
    }

    // Xóa đánh giá của chính mình
    async removeByUser(userId: number, reviewId: number) {
    const review = await this.prisma.review.findUnique({ where: { id: reviewId } });
    if (!review) throw new NotFoundException(await this.i18n.translate('reviews.error.not_found'));

    if (review.customerId !== userId) {
        throw new BadRequestException(await this.i18n.translate('reviews.error.unauthorized'));
    }

    await this.prisma.review.delete({ where: { id: reviewId } });
    this.cleanupReviewImages(review.images || []);

    return {
        success: true,
        message: await this.i18n.translate('reviews.success.deleted'),
    };
    }

  // 2. LẤY DANH SÁCH ĐÁNH GIÁ (CHO PUBLIC - CHI TIẾT SẢN PHẨM)
  async findAllByProduct(productId: number, query: { skip?: number; take?: number }) {
    const skip = query.skip ? Number(query.skip) : 0;
    const take = query.take ? Number(query.take) : 10;

    const [items, total] = await this.prisma.$transaction([
      this.prisma.review.findMany({
        where: { productId },
        skip,
        take,
        orderBy: { createdAt: 'desc' },
        include: {
          customer: {
            select: { id: true, name: true, email: true } // Ẩn password và các trường nhạy cảm
          }
        }
      }),
      this.prisma.review.count({ where: { productId } })
    ]);

    // Tính điểm trung bình
    const aggregate = await this.prisma.review.aggregate({
      _avg: { rating: true },
      where: { productId }
    });

    return {
      items,
      total,
      averageRating: aggregate._avg.rating || 0
    };
  }

  // 3. LẤY DANH SÁCH ĐÁNH GIÁ (CHO ADMIN)
  async findAllForAdmin(query: { q?: string; productId?: string; skip?: number; take?: number }) {
    const where: any = {};

    if (query.productId) {
      where.productId = Number(query.productId);
    }

    const [items, total] = await this.prisma.$transaction([
      this.prisma.review.findMany({
        where,
        skip: query.skip ? Number(query.skip) : 0,
        take: query.take ? Number(query.take) : 20,
        orderBy: { createdAt: 'desc' },
        include: {
          customer: { select: { id: true, name: true, email: true } },
          product: { select: { id: true, name: true, slug: true } },
          order: { select: { id: true, code: true } }
        }
      }),
      this.prisma.review.count({ where })
    ]);

    return { items, total };
  }

  // 4. ADMIN TRẢ LỜI ĐÁNH GIÁ
  async replyByAdmin(id: number, dto: ReplyReviewDto) {
    const review = await this.prisma.review.findUnique({ where: { id } });
    
    if (!review) {
      throw new NotFoundException(await this.i18n.translate('reviews.error.not_found'));
    }

    const updatedReview = await this.prisma.review.update({
      where: { id },
      data: {
        adminReply: dto.adminReply, // Lưu phản hồi của Admin
      }
    });

    return {
      success: true,
      message: await this.i18n.translate('reviews.success.replied'),
      data: updatedReview
    };
  }

  // 5. ADMIN XÓA ĐÁNH GIÁ (Vi phạm chuẩn mực)
  async remove(id: number) {
    const review = await this.prisma.review.findUnique({ where: { id } });
    if (!review) throw new NotFoundException(await this.i18n.translate('reviews.error.not_found'));

    await this.prisma.review.delete({ where: { id } });
    this.cleanupReviewImages(review.images || []);

    return { success: true, message: await this.i18n.translate('reviews.success.deleted') };
  }
}