import { Injectable, BadRequestException, NotFoundException, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateReviewDto } from './dto/create-review.dto';
import { ReplyReviewDto } from './dto/reply-review.dto';
import { UpdateReviewDto } from './dto/update-review.dto';
import { I18nService } from 'nestjs-i18n';
import * as fs from 'fs';
import { basename, dirname, resolve } from 'path';

type PendingFileMove = {
  from: string;
  to: string;
};

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

  // Phân tích đường dẫn hình ảnh xem nó đang ở tmp hay đã ở review
  private parseReviewUploadPath(imageUrl: string): { relative: string; absolute: string } | null {
    if (!imageUrl) return null;
    let pathname = imageUrl.trim();
    try {
      if (/^https?:\/\//i.test(pathname)) {
        pathname = new URL(pathname).pathname;
      }
    } catch { return null; }

    pathname = pathname.split('?')[0].replace(/^\/+/, '');
    // Cho phép cả tmp và reviews
    if (!pathname.startsWith('uploads/reviews/') && !pathname.startsWith('uploads/tmp/')) {
      return null;
    }

    const absolute = resolve(this.publicRootDir, pathname);
    if (!absolute.startsWith(this.publicRootDir)) return null;

    return { relative: pathname, absolute };
  }

  private async ensureDir(path: string) {
    await fs.promises.mkdir(path, { recursive: true });
  }

  private moveFileSafe(from: string, to: string) {
    if (!fs.existsSync(dirname(to))) {
      fs.mkdirSync(dirname(to), { recursive: true });
    }
    if (from === to) return;
    try { fs.accessSync(from); } catch {
      try { fs.accessSync(to); return; } catch { throw new Error(`File not found: ${from}`); }
    }
    try { fs.renameSync(from, to); } catch (error: any) {
      if (error?.code === 'EXDEV') {
        fs.copyFileSync(from, to);
        fs.unlinkSync(from);
        return;
      }
      throw error;
    }
  }

  private calculateReviewImagePath(productId: number, imageUrl: string): { url: string; fileToMove: PendingFileMove | null } {
    const parsed = this.parseReviewUploadPath(imageUrl);
    if (!parsed) return { url: imageUrl, fileToMove: null };

    const filename = basename(parsed.relative);
    const targetRelative = `uploads/reviews/product-${productId}/${filename}`;
    const targetAbsolute = resolve(this.publicRootDir, targetRelative);

    if (parsed.relative === targetRelative) {
      return { url: `/${targetRelative}`, fileToMove: null };
    }

    return {
      url: `/${targetRelative}`,
      fileToMove: { from: parsed.absolute, to: targetAbsolute },
    };
  }

  // ==============================================================
  // USER FEATURES (STOREFRONT)
  // ==============================================================

  async create(userId: number, dto: CreateReviewDto) {
    const validOrder = await this.prisma.order.findFirst({
      where: {
        id: dto.orderId,
        customerId: userId,
        status: 'DELIVERED', 
        items: { some: { productId: dto.productId } }
      }
    });

    if (!validOrder) throw new BadRequestException(await this.i18n.translate('reviews.error.not_eligible'));

    const existingReview = await this.prisma.review.findFirst({
      where: { customerId: userId, orderId: dto.orderId, productId: dto.productId }
    });

    if (existingReview) throw new BadRequestException(await this.i18n.translate('reviews.error.already_reviewed'));

    const pendingMoves: PendingFileMove[] = [];
    const finalImageUrls: string[] = [];

    // Tính toán đường dẫn tương lai cho ảnh (Nếu có)
    for (const url of (dto.images || [])) {
        const calc = this.calculateReviewImagePath(dto.productId, url);
        finalImageUrls.push(calc.url);
        if (calc.fileToMove) pendingMoves.push(calc.fileToMove);
    }

    // TRANSACTION LOCK
    const review = await this.prisma.$transaction(async (tx) => {
        return tx.review.create({
            data: {
                customerId: userId,
                productId: dto.productId,
                orderId: dto.orderId,
                rating: dto.rating,
                comment: dto.comment,
                images: finalImageUrls,
            }
        });
    });

    // CHẠY FILE SYSTEM SAU KHI DB THÀNH CÔNG
    for (const move of pendingMoves) {
        this.moveFileSafe(move.from, move.to);
    }

    return {
      success: true,
      message: await this.i18n.translate('reviews.success.created'),
      data: review
    };
  }

  async update(userId: number, reviewId: number, dto: UpdateReviewDto) {
    const review = await this.prisma.review.findUnique({ where: { id: reviewId } });
    if (!review) throw new NotFoundException(await this.i18n.translate('reviews.error.not_found'));
    if (review.customerId !== userId) throw new BadRequestException(await this.i18n.translate('reviews.error.unauthorized'));

    const nextImages = dto.images !== undefined ? dto.images : (review.images || []);
    const pendingMoves: PendingFileMove[] = [];
    const pendingDeletes: string[] = [];
    const finalImageUrls: string[] = [];

    // 1. Phân tích ảnh mới được đưa vào
    for (const url of nextImages) {
        const calc = this.calculateReviewImagePath(review.productId, url);
        finalImageUrls.push(calc.url);
        if (calc.fileToMove) pendingMoves.push(calc.fileToMove);
    }

    // 2. Tính toán ảnh bị xóa (Ảnh có trong DB nhưng không có trong nextImages)
    const removedImages = (review.images || []).filter((img) => !finalImageUrls.includes(img));
    for (const imgUrl of removedImages) {
        const parsed = this.parseReviewUploadPath(imgUrl);
        if (parsed) pendingDeletes.push(parsed.absolute);
    }

    // TRANSACTION LOCK
    const updated = await this.prisma.$transaction(async (tx) => {
        return tx.review.update({
            where: { id: reviewId },
            data: {
                rating: dto.rating ?? review.rating,
                comment: dto.comment !== undefined ? dto.comment : review.comment,
                images: finalImageUrls,
            },
        });
    });

    // CHẠY FILE SYSTEM SAU KHI DB THÀNH CÔNG
    for (const move of pendingMoves) {
        this.moveFileSafe(move.from, move.to);
    }
    for (const filePath of pendingDeletes) {
        try { if (fs.existsSync(filePath)) fs.unlinkSync(filePath); } catch (e) { /* ignore */ }
    }

    return {
        success: true,
        message: await this.i18n.translate('reviews.success.updated'),
        data: updated,
    };
  }

  async removeByUser(userId: number, reviewId: number) {
    const review = await this.prisma.review.findUnique({ where: { id: reviewId } });
    if (!review) throw new NotFoundException(await this.i18n.translate('reviews.error.not_found'));
    if (review.customerId !== userId) throw new BadRequestException(await this.i18n.translate('reviews.error.unauthorized'));

    const pendingDeletes: string[] = [];
    for (const imgUrl of (review.images || [])) {
        const parsed = this.parseReviewUploadPath(imgUrl);
        if (parsed) pendingDeletes.push(parsed.absolute);
    }

    // TRANSACTION LOCK
    await this.prisma.$transaction(async (tx) => {
        await tx.review.delete({ where: { id: reviewId } });
    });

    // XÓA FILE SAU CÙNG
    for (const filePath of pendingDeletes) {
        try { if (fs.existsSync(filePath)) fs.unlinkSync(filePath); } catch (e) { /* ignore */ }
    }

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
    if (!review) {
        throw new NotFoundException(await this.i18n.translate('reviews.error.not_found'));
    }

    // 1. Phân tích các đường dẫn file cần xóa vật lý
    const pendingDeletes: string[] = [];
    for (const imgUrl of (review.images || [])) {
        const parsed = this.parseReviewUploadPath(imgUrl);
        if (parsed) pendingDeletes.push(parsed.absolute);
    }

    // 2. Xóa bản ghi trong Database an toàn bằng Transaction
    await this.prisma.$transaction(async (tx) => {
        await tx.review.delete({ where: { id } });
    });

    // 3. DB chốt thành công -> Mới rảo bước xóa file vật lý
    for (const filePath of pendingDeletes) {
        try { 
            if (fs.existsSync(filePath)) fs.unlinkSync(filePath); 
        } catch (e) { 
            this.logger.warn(`Lỗi xóa file vật lý (Admin remove): ${filePath}`); 
        }
    }

    return { 
        success: true, 
        message: await this.i18n.translate('reviews.success.deleted') 
    };
  }
}