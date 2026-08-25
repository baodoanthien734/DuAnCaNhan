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

  // ==============================================================
  // FILE SYSTEM MANAGEMENT (UPLOAD & CLEANUP)
  // ==============================================================

  // Giải quyết đường dẫn tuyệt đối của hình ảnh đánh giá dựa trên URL
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

  // Dọn dẹp các hình ảnh đánh giá không còn được sử dụng 
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

  // ==============================================================
  // USER FEATURES (STOREFRONT)
  // ==============================================================

  // 1. Tạo đánh giá mới cho sản phẩm
  async create(userId: number, dto: CreateReviewDto) {
    const validOrder = await this.prisma.order.findFirst({
      where: {
        id: dto.orderId,
        customerId: userId,
        status: 'DELIVERED', 
        items: {
          some: { productId: dto.productId }
        }
      }
    });

    if (!validOrder) {
      throw new BadRequestException(await this.i18n.translate('reviews.error.not_eligible'));
    }

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

  // 2. Cập nhật đánh giá của người dùng
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

  // 3. Xoá đánh giá từ phía của người dùng
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

  // 4. Hiển thị toàn bộ đánh giá cho một sản phẩm
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
            select: { id: true, name: true, email: true } 
          }
        }
      }),
      this.prisma.review.count({ where: { productId } })
    ]);

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

  // ==============================================================
  // ADMIN FEATURES (MANAGEMENT & MODERATION)
  // ==============================================================

  // 1. Lấy danh sách đánh giá với các bộ lọc, hỗ trợ phân trang
  async findAllForAdmin(query: { q?: string; productId?: string; rating?: string; replyStatus?: string; skip?: number; take?: number }) {
    const where: any = {};

    if (query.productId) {
      where.productId = Number(query.productId);
    }

    if (query.q) {
      where.OR = [
        { customer: { name: { contains: query.q, mode: 'insensitive' } } },
        { customer: { email: { contains: query.q, mode: 'insensitive' } } },
        { order: { code: { contains: query.q, mode: 'insensitive' } } },
      ];
    }

    if (query.rating && !isNaN(Number(query.rating))) {
      where.rating = Number(query.rating);
    }

    if (query.replyStatus === 'replied') {
      where.adminReply = { not: null };
    } else if (query.replyStatus === 'unreplied') {
      where.adminReply = null;
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

  // 2. Trả lời đánh giá từ phía Admin
  async replyByAdmin(id: number, dto: ReplyReviewDto) {
    const review = await this.prisma.review.findUnique({ where: { id } });
    
    if (!review) {
      throw new NotFoundException(await this.i18n.translate('reviews.error.not_found'));
    }

    const updatedReview = await this.prisma.review.update({
      where: { id },
      data: {
        adminReply: dto.adminReply, 
      }
    });

    return {
      success: true,
      message: await this.i18n.translate('reviews.success.replied'),
      data: updatedReview
    };
  }

  // 3. Xoá đánh giá từ phía Admin
  async remove(id: number) {
    const review = await this.prisma.review.findUnique({ where: { id } });
    if (!review) throw new NotFoundException(await this.i18n.translate('reviews.error.not_found'));

    await this.prisma.review.delete({ where: { id } });
    this.cleanupReviewImages(review.images || []);

    return { success: true, message: await this.i18n.translate('reviews.success.deleted') };
  }
}