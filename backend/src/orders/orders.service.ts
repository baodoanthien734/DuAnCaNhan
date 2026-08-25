import { Injectable, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { I18nService } from 'nestjs-i18n';
import { PrismaService } from '../prisma/prisma.service';
import { CartService } from '../cart/cart.service';
import { CheckoutDto } from './dto/checkout.dto';
import { OrderStatus, PaymentStatus } from '@prisma/client';

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

  // 1. Thêm hàm checkout
  async checkout(userId: number, dto: CheckoutDto) {
    // 1. Lấy Giỏ hàng hiện tại
    const cart = await this.cartService.getCart(userId);
    if (!cart || !cart.items || cart.items.length === 0) {
      throw new BadRequestException(this.i18n.t('order.error.empty_cart'));
    }

    // 2. Tính toán Giá cho từng Item
    let totalAmount = 0;
    const orderItemsData: any[] = [];

    for (const item of cart.items) {
      if (!item.product || item.product.status !== 'ACTIVE') {
        throw new BadRequestException(
          this.i18n.t('order.error.out_of_stock', { args: { productName: item.product?.name || 'Unknown' } })
        );
      }

      let itemPrice = Number(item.variant?.price || item.product.basePrice);
      let variantName = item.variant?.name || null;

      const customs = item.customizations as any[];
      if (customs && Array.isArray(customs)) {
        customs.forEach((c) => {
          if (c.extraPrice) {
            itemPrice += Number(c.extraPrice);
          }
        });
      }

      totalAmount += itemPrice * item.quantity;

      orderItemsData.push({
        productId: item.productId,
        variantId: item.variantId,
        productName: item.product.name, 
        variantName: variantName,       
        price: itemPrice,               
        quantity: item.quantity,
        customizations: item.customizations, 
      });
    }

    // 3. Thực thi Giao dịch Database (Transaction)
    try {
      const order = await this.prisma.$transaction(async (tx) => {
        
        // =================================================================
        // BƯỚC 3.1: TRỪ KHO VỚI OPTIMISTIC LOCKING
        // =================================================================
        for (const item of cart.items) {
          if (!item.variantId || !item.variant) {
             throw new BadRequestException(`Sản phẩm ${item.product.name} thiếu thông tin biến thể.`);
          }

          // Cập nhật kẹp điều kiện Version và Stock
          const updateResult = await tx.productVariant.updateMany({
            where: {
              id: item.variantId,
              version: item.variant.version, // Đảm bảo chưa có ai chạm vào dữ liệu này
              stock: { gte: item.quantity }  // Đảm bảo hàng trong kho phải >= số lượng cần mua
            },
            data: {
              stock: { decrement: item.quantity },
              version: { increment: 1 }      // Tăng version lên để khóa các request đến chậm hơn
            }
          });

          // Nếu count === 0, nghĩa là câu lệnh WHERE ở trên không tìm thấy dòng nào khớp
          if (updateResult.count === 0) {
            // Ném lỗi để ROLLBACK toàn bộ transaction!
            throw new BadRequestException(
              this.i18n.t('order.error.inventory_changed', { args: { productName: item.product.name } })
            );
          }
        }
        // =================================================================

        // 3.2. Tạo Đơn hàng
        const orderCode = `ORD-${Date.now()}`;
        const newOrder = await tx.order.create({
          data: {
            code: orderCode,
            customerId: userId,
            addressId: dto.addressId,
            totalAmount: totalAmount,
            paymentMethod: dto.paymentMethod,
            note: dto.note,
            items: {
              create: orderItemsData, 
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
      this.logger.error('Lỗi khi đặt hàng:', error);
      // Nếu lỗi là BadRequestException (tức là lỗi kho ta chủ động ném ra ở trên), ta ném nó ra ngoài luôn để Frontend hiển thị chữ
      if (error instanceof BadRequestException) {
        throw error; 
      }
      // Các lỗi khác của Database thì vứt ra lỗi chung
      throw new BadRequestException('Không thể xử lý đơn hàng lúc này.');
    }
  }

  // 2. Thêm hàm xem danh sách đơn hàng của khách
  async findMyOrders(userId: number) {
    const orders = await this.prisma.order.findMany({
      where: { customerId: userId },
      orderBy: { createdAt: 'desc' },
      include: { items: true }, 
    });

    for (const order of orders) {
      for (const item of order.items) {
        const product = await this.prisma.product.findUnique({
          where: { id: item.productId },
          select: { slug: true, images: true }
        });
        
        let imageUrl: string | null = null;

        if (item.variantId) {
          const variant = await this.prisma.productVariant.findUnique({
            where: { id: item.variantId },
            select: { image: true }
          });
          if (variant && variant.image) {
            imageUrl = variant.image;
          }
        }

        if (!imageUrl && product && product.images && product.images.length > 0) {
          imageUrl = product.images[0];
        }

        (item as any).productSlug = product?.slug || null;
        (item as any).imageUrl = imageUrl;
      }
    }

    return orders;
  }

  // 3. Thêm hàm xem chi tiết 1 đơn hàng
  async findOneMyOrder(userId: number, orderId: number) {
    const order = await this.prisma.order.findFirst({
      where: { 
        id: orderId,
        customerId: userId 
      },
      include: {
        address: true,
        items: true,
        reviews: true,
      }
    });

    if (!order) {
      throw new NotFoundException(this.i18n.t('order.error.order_not_found'));
    }

    for (const item of order.items) {
      const product = await this.prisma.product.findUnique({
        where: { id: item.productId },
        select: { slug: true, images: true }
      });
      
      let imageUrl: string | null = null;
      
      if (item.variantId) {
        const variant = await this.prisma.productVariant.findUnique({
          where: { id: item.variantId },
          select: { image: true }
        });
        if (variant && variant.image) imageUrl = variant.image;
      }

      if (!imageUrl && product && product.images && product.images.length > 0) {
        imageUrl = product.images[0];
      }

      (item as any).productSlug = product?.slug || null;
      (item as any).imageUrl = imageUrl;
    }

    return order;
  }

  // 4. Thêm hàm khách hàng tự hủy đơn
  async cancelOrder(userId: number, orderId: number) {
    const order = await this.prisma.order.findFirst({
      where: { 
        id: orderId,
        customerId: userId 
      },
      include: { items: true } // Lấy cả items để hoàn kho
    });

    if (!order) {
      throw new NotFoundException(this.i18n.t('order.error.order_not_found'));
    }

    // Chỉ cho phép hủy nếu đơn hàng đang chờ thanh toán
    if (order.status !== OrderStatus.PENDING) {
      throw new BadRequestException(
        this.i18n.t('order.error.cannot_cancel_status', { 
          defaultValue: 'Chỉ có thể hủy đơn hàng khi đang chờ xác nhận.' 
        })
      );
    }

    // Dùng Transaction để đảm bảo vừa đổi trạng thái đơn, vừa hoàn lại kho an toàn
    return this.prisma.$transaction(async (tx) => {
      // 1. Đổi trạng thái thành CANCELLED
      const cancelledOrder = await tx.order.update({
        where: { id: orderId },
        data: { status: 'CANCELLED' }
      });

      // 2. Hoàn lại tồn kho cho từng sản phẩm/biến thể
      for (const item of order.items) {
        if (item.variantId) {
          // Hoàn kho cho Biến thể (Variant)
          await tx.productVariant.update({
            where: { id: item.variantId },
            data: { stock: { increment: item.quantity } }
          });
        }
        // Ghi chú: Nếu hệ thống của bạn có lưu stock ở bảng Product (dành cho sản phẩm không có biến thể), 
        // bạn cần viết thêm logic hoàn kho ở đây.
      }

      return {
        success: true,
        message: this.i18n.t('order.success.order_cancelled', { defaultValue: 'Hủy đơn hàng thành công.' }),
        data: cancelledOrder
      };
    });
  }

  // ==========================================
  // PHẦN 2: DÀNH CHO QUẢN TRỊ VIÊN (ADMIN)
  // ==========================================

  // 1. Thêm hàm xem danh sách đơn hàng cho Admin
  async findAllForAdmin(query: { q?: string; dateRange?: string; status?: OrderStatus; skip?: number; take?: number }) {
    const where: any = {};

    // 1. Lọc theo Trạng thái (Status)
    if (query.status) {
      where.status = query.status;
    }

    // 2. Lọc theo Từ khóa tìm kiếm (Mã đơn, Tên KH, Email, hoặc Số điện thoại)
    if (query.q) {
      where.OR = [
        { code: { contains: query.q, mode: 'insensitive' } },
        { customer: { name: { contains: query.q, mode: 'insensitive' } } },
        { customer: { email: { contains: query.q, mode: 'insensitive' } } },
        { address: { phone: { contains: query.q } } }, // Tìm theo SĐT nhận hàng
      ];
    }

    // 3. Lọc theo Thời gian (Date Range)
    if (query.dateRange) {
      const now = new Date();
      
      // SỬA Ở ĐÂY: Thêm "| null" để TypeScript cho phép gán giá trị null
      let startDate: Date | null = null; 

      switch (query.dateRange) {
        case 'today':
          startDate = new Date(now.setHours(0, 0, 0, 0));
          break;
        case '7days':
          startDate = new Date();
          startDate.setDate(startDate.getDate() - 7);
          break;
        case 'month':
          startDate = new Date(now.getFullYear(), now.getMonth(), 1);
          break;
        case 'year':
          startDate = new Date(now.getFullYear(), 0, 1);
          break;
        default:
          startDate = null;
      }

      if (startDate) {
        where.createdAt = { gte: startDate };
      }
    }

    // 4. Thực thi truy vấn với Prisma
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

  // 5. Admin cập nhật trạng thái đơn
  async updateStatus(id: number, status: OrderStatus) {
    const order = await this.prisma.order.findUnique({
      where: { id },
      include: { items: true }, 
    });
    
    if (!order) throw new NotFoundException(this.i18n.t('order.error.order_not_found'));

    // LUẬT 1: Đã HỦY thì không thể hồi sinh
    if (order.status === 'CANCELLED') {
      // ĐÃ CẤU HÌNH i18n
      throw new BadRequestException(this.i18n.t('order.error.cannot_change_cancelled_status'));
    }

    await this.prisma.$transaction(async (tx) => {
      const updateData: any = { status };

      // LUẬT 2: Hook Auto-trigger cho Đơn COD
      if (
        status === 'DELIVERED' && 
        order.paymentMethod === 'COD' && 
        order.paymentStatus === 'UNPAID'
      ) {
        updateData.paymentStatus = 'PAID';
      }

      // LUẬT 3: Hoàn kho nếu Admin chuyển trạng thái thành HỦY
      if (status === 'CANCELLED') {
        for (const item of order.items) {
          if (item.variantId) {
            await tx.productVariant.update({
              where: { id: item.variantId },
              data: { stock: { increment: item.quantity } },
            });
          }
        }
        
        // MỚI: Tự động chuyển Payment Status về UNPAID nếu đang là PAID
        if (order.paymentStatus === 'PAID') {
          updateData.paymentStatus = 'UNPAID';
        }
      }

      await tx.order.update({
        where: { id },
        data: updateData,
      });
    });

    return { success: true, message: this.i18n.t('order.success.status_updated') };
  }

  // 6. Admin xem chi tiết 1 đơn hàng
  async findOneForAdmin(id: number) {
    const order = await this.prisma.order.findUnique({
      where: { id },
      include: {
        customer: { select: { id: true, name: true, email: true } },
        address: true,
        items: true, 
      },
    });

    if (!order) {
      throw new NotFoundException(this.i18n.t('order.error.order_not_found'));
    }
    return order;
  }
    // 7. Admin cập nhật trạng thái thanh toán (Quyền tuyệt đối)
  async updatePaymentStatus(id: number, paymentStatus: PaymentStatus) {
    const order = await this.prisma.order.findUnique({ where: { id } });
    if (!order) throw new NotFoundException(this.i18n.t('order.error.order_not_found'));

    await this.prisma.order.update({
      where: { id },
      data: { paymentStatus },
    });

    return { 
      success: true, 
      // ĐÃ CẤU HÌNH i18n
      message: this.i18n.t('order.success.payment_status_updated') 
    };
  }
}