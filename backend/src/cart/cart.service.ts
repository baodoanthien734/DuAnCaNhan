/**
 * @fileoverview Service quản lý giỏ hàng với hỗ trợ tùy chọn cá nhân hóa
 * 
 * Chức năng chính:
 * - Tự động tạo cart cho user chưa có
 * - Thêm item vào cart với merge logic dựa trên customizations
 * - Cập nhật số lượng item
 * - Xóa item khỏi cart
 * - Validate guest cart (refresh thông tin tồn kho từ DB)
 * 
 * Merge Logic:
 * - Cùng productId + variantId + customizations (JSON so sánh) → Cộng dồn quantity
 * - Khác biệt → Tạo item mới
 * 
 * Customizations Structure:
 * JSON array: [{"name": "Tên thêu", "value": "Anya", "price": 0}, ...]
 */
import { Injectable, NotFoundException } from '@nestjs/common';
import { I18nService } from 'nestjs-i18n';
import { PrismaService } from '../prisma/prisma.service';
import { AddCartItemDto } from './dto/add-cart-item.dto';
import { UpdateCartItemDto } from './dto/update-cart-item.dto';

@Injectable()
export class CartService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly i18n: I18nService,
  ) {}

  // Hàm Helper: Tìm giỏ hàng hiện tại, nếu chưa có thì tự động tạo mới
  private async getOrCreateCart(userId: number) {
    let cart = await this.prisma.cart.findUnique({
      where: { userId },
    });

    if (!cart) {
      cart = await this.prisma.cart.create({
        data: { userId },
      });
    }
    return cart;
  }

  // Lấy toàn bộ chi tiết giỏ hàng
  async getCart(userId: number) {
    const cart = await this.getOrCreateCart(userId);

    return this.prisma.cart.findUnique({
      where: { id: cart.id },
      include: {
        items: {
          include: {
            product: {
              select: { id: true, name: true, slug: true, basePrice: true, images: true, status: true },
            },
            variant: {
              select: { id: true, name: true, price: true, image: true, stock: true, version: true },
            },
          },
          orderBy: { createdAt: 'desc' },
        },
      },
    });
  }

  // Thêm sản phẩm vào giỏ
  async addItem(userId: number, dto: AddCartItemDto) {
    // 1. Kiểm tra xem sản phẩm có tồn tại và đang bán không
    const product = await this.prisma.product.findUnique({
      where: { id: dto.productId },
    });

    if (!product || product.status !== 'ACTIVE') {
      throw new NotFoundException(this.i18n.t('cart.error.product_not_found'));
    }

    const cart = await this.getOrCreateCart(userId);

    // 2. Tìm tất cả các item trong giỏ hàng có cùng productId và variantId
    const existingItems = await this.prisma.cartItem.findMany({
      where: {
        cartId: cart.id,
        productId: dto.productId,
        variantId: dto.variantId || null,
      },
    });

    // 3. Logic quan trọng: So sánh tùy chọn cá nhân hóa (customizations JSON)
    const matchItem = existingItems.find(
      (item) => JSON.stringify(item.customizations) === JSON.stringify(dto.customizations || null)
    );

    if (matchItem) {
      // Nếu hoàn toàn trùng khớp -> Cộng dồn số lượng
      return this.prisma.cartItem.update({
        where: { id: matchItem.id },
        data: { quantity: matchItem.quantity + dto.quantity },
      });
    }

    // Nếu khác customizations hoặc chưa từng có -> Tạo dòng item mới
    return this.prisma.cartItem.create({
      data: {
        cartId: cart.id,
        productId: dto.productId,
        variantId: dto.variantId || null,
        quantity: dto.quantity,
        customizations: dto.customizations || null,
      },
    });
  }

  // Cập nhật số lượng
  async updateItem(userId: number, itemId: number, dto: UpdateCartItemDto) {
    const cart = await this.getOrCreateCart(userId);

    const item = await this.prisma.cartItem.findFirst({
      where: { id: itemId, cartId: cart.id },
    });

    if (!item) {
      throw new NotFoundException(this.i18n.t('cart.error.item_not_found'));
    }

    return this.prisma.cartItem.update({
      where: { id: itemId },
      data: { quantity: dto.quantity },
    });
  }

  // Xóa sản phẩm khỏi giỏ
  async removeItem(userId: number, itemId: number) {
    const cart = await this.getOrCreateCart(userId);

    const item = await this.prisma.cartItem.findFirst({
      where: { id: itemId, cartId: cart.id },
    });

    if (!item) {
      throw new NotFoundException(this.i18n.t('cart.error.item_not_found'));
    }

    return this.prisma.cartItem.delete({
      where: { id: itemId },
    });
  }

  /// Hàm public kiểm tra và làm mới giỏ hàng của khách (Guest Cart) dựa trên dữ liệu từ FE gửi lên
  async validateGuestCart(items: any[]) {
    if (!items || items.length === 0) return { items: [] };

    const validatedItems = await Promise.all(
      items.map(async (item) => {
        // 1. Lấy thông tin mới nhất của Sản phẩm gốc
        const product = await this.prisma.product.findUnique({
          where: { id: item.productId },
          select: { id: true, name: true, slug: true, basePrice: true, images: true, status: true },
        });

        // 2. Lấy thông tin mới nhất của Biến thể (nếu có) - FIX TYPESCRIPT Ở ĐÂY 👇
        const variant = item.variantId
          ? await this.prisma.productVariant.findUnique({
              where: { id: item.variantId },
              select: { id: true, name: true, price: true, image: true, stock: true, version: true },
            })
          : null;

        // 3. Trả về cấu trúc item đã được "làm mới" (Refresh) dữ liệu từ DB
        return {
          ...item,
          product: product || item.product, // Ghi đè product từ DB (nếu mất DB thì giữ tạm cũ để FE báo lỗi)
          variant: variant || item.variant, // Ghi đè variant từ DB để có số lượng stock mới nhất
        };
      })
    );

    return { items: validatedItems };
  }
}