import { Injectable, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { I18nService } from 'nestjs-i18n';
import { PrismaService } from '../prisma/prisma.service';
import { CartService } from '../cart/cart.service';
import { CheckoutDto } from './dto/checkout.dto';
import { UpdateOrderStatusDto } from './dto/update-order-status.dto';
import { OrderStatus } from '@prisma/client';

@Injectable()
export class OrdersService {
  private readonly logger = new Logger(OrdersService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly cartService: CartService,
    private readonly i18n: I18nService,
  ) {}

  // ==========================================
  // PHẦN 1: DÀNH CHO KHÁCH HÀNG (USER)
  // ==========================================

  async checkout(userId: number, dto: CheckoutDto) {
    // 1. Lấy Giỏ hàng hiện tại
    const cart = await this.cartService.getCart(userId);
    if (!cart || !cart.items || cart.items.length === 0) {
      throw new BadRequestException(this.i18n.t('order.error.empty_cart'));
    }

    // 2. Tính toán Giá cho từng Item (Tuyệt đối không lấy giá từ Frontend)
    let totalAmount = 0;
    const orderItemsData: any[] = [];

    for (const item of cart.items) {
      // 2.1 Kiểm tra sản phẩm còn tồn tại và Active không?
      if (!item.product || item.product.status !== 'ACTIVE') {
        throw new BadRequestException(
          this.i18n.t('order.error.out_of_stock', { args: { productName: item.product?.name || 'Unknown' } })
        );
      }

      // 2.2 Tính giá gốc (Base Price) hoặc giá Biến thể (Variant Price)
      let itemPrice = Number(item.variant?.price || item.product.basePrice);
      let variantName = item.variant?.name || null;

      // 2.3 Phân tích chuỗi JSON Customizations để cộng thêm phí (extraPrice)
      // Giả sử JSON có cấu trúc: [{ name: "Charm", value: "Thỏ", extraPrice: 10000 }]
      const customs = item.customizations as any[];
      if (customs && Array.isArray(customs)) {
        customs.forEach((c) => {
          if (c.extraPrice) {
            itemPrice += Number(c.extraPrice);
          }
        });
      }

      // Cộng dồn vào tổng hóa đơn
      totalAmount += itemPrice * item.quantity;

      // Chuẩn bị dữ liệu Snapshot cho OrderItem
      orderItemsData.push({
        productId: item.productId,
        variantId: item.variantId,
        productName: item.product.name, // SNAPSHOT Tên SP
        variantName: variantName,       // SNAPSHOT Tên Biến thể
        price: itemPrice,               // SNAPSHOT Giá (Đã cộng phụ phí)
        quantity: item.quantity,
        customizations: item.customizations, // SNAPSHOT Cá nhân hóa
      });
    }

    // 3. Thực thi Giao dịch Database (Transaction)
    try {
      const order = await this.prisma.$transaction(async (tx) => {
        // Tạo chuỗi mã đơn hàng ngẫu nhiên (Ví dụ: ORD-1691234567)
        const orderCode = `ORD-${Date.now()}`;

        // 3.1. Tạo Đơn hàng
        const newOrder = await tx.order.create({
          data: {
            code: orderCode,
            customerId: userId,
            addressId: dto.addressId,
            totalAmount: totalAmount,
            paymentMethod: dto.paymentMethod,
            note: dto.note,
            items: {
              create: orderItemsData, // 3.2. Tạo chi tiết đơn hàng
            },
          },
        });

        // 3.3. Xóa sạch Giỏ hàng
        await tx.cartItem.deleteMany({
          where: { cartId: cart.id },
        });

        return newOrder;
      });

      return {
        success: true,
        message: this.i18n.t('order.success.order_placed'),
        data: order,
      };
    } catch (error) {
      this.logger.error('Lỗi Database khi đặt hàng:', error);
      throw new BadRequestException('Không thể xử lý đơn hàng lúc này.');
    }
  }

  // Khách hàng xem lịch sử đơn hàng của mình
  async findMyOrders(userId: number) {
    return this.prisma.order.findMany({
      where: { customerId: userId },
      orderBy: { createdAt: 'desc' },
      include: {
        items: true,
      },
    });
  }

  // ==========================================
  // PHẦN 2: DÀNH CHO QUẢN TRỊ VIÊN (ADMIN)
  // ==========================================

  // Admin xem tất cả đơn hàng (có thể lọc theo status)
  async findAllForAdmin(query: { status?: OrderStatus; skip?: number; take?: number }) {
    const where: any = {};
    if (query.status) where.status = query.status;

    const [items, total] = await this.prisma.$transaction([
      this.prisma.order.findMany({
        where,
        skip: query.skip ? Number(query.skip) : 0,
        take: query.take ? Number(query.take) : 20,
        orderBy: { createdAt: 'desc' },
        include: {
          customer: { select: { id: true, name: true, email: true } },
          address: true,
        },
      }),
      this.prisma.order.count({ where }),
    ]);

    return { items, total };
  }

  // Admin cập nhật trạng thái đơn (Ví dụ: SHIPPING -> DELIVERED)
  async updateStatus(id: number, status: OrderStatus) {
    const order = await this.prisma.order.findUnique({ where: { id } });
    if (!order) throw new NotFoundException(this.i18n.t('order.error.order_not_found'));

    await this.prisma.order.update({
      where: { id },
      data: { status },
    });

    return { success: true, message: this.i18n.t('order.success.status_updated') };
  }
}