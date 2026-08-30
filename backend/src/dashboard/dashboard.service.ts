import { Injectable, InternalServerErrorException, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { I18nService } from 'nestjs-i18n';
import { OrderStatus, PaymentStatus, ProductStatus } from '@prisma/client';
import dayjs from 'dayjs';

@Injectable()
export class DashboardService {
  private readonly logger = new Logger(DashboardService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly i18n: I18nService,
  ) {}

  async getStats() {
    try {
      const totalOrders = await this.prisma.order.count();
      
      // TÍNH DOANH THU DỰA TRÊN DÒNG TIỀN THỰC TẾ (PAID)
      const revenueAggregation = await this.prisma.order.aggregate({
        _sum: { totalAmount: true },
        where: { paymentStatus: PaymentStatus.PAID }, 
      });
      const totalRevenue = revenueAggregation._sum.totalAmount || 0;
      
      const totalProducts = await this.prisma.product.count({
        where: { status: ProductStatus.ACTIVE },
      });
      
      const totalCustomers = await this.prisma.user.count({
        where: { roles: { none: { name: { in: ['ADMIN', 'MANAGER'] } } } },
      });

      const recentOrders = await this.prisma.order.findMany({
        take: 5,
        orderBy: { createdAt: 'desc' },
        include: {
          customer: { select: { name: true, email: true } },
        },
      });

      // 1. CẢNH BÁO SẮP HẾT HÀNG: Tồn kho < 10 (lt: 10)
      const lowStockVariants = await this.prisma.productVariant.findMany({
        where: { stock: { lt: 10 } }, // Nhỏ hơn 10
        orderBy: { stock: 'asc' },    // Ưu tiên xếp hàng sắp hết nhất (0, 1, 2...) lên đầu
        take: 50,                     // Lấy tối đa 50 món để giao diện có thể cuộn (scroll)
        include: {
          product: { select: { name: true } },
        },
      });

      // 2. GỌI DỮ LIỆU ĐỘNG CHO BIỂU ĐỒ (7 NGÀY & 28 NGÀY)
      const chartData7Days = await this.getRevenueChartData(7);
      const chartData28Days = await this.getRevenueChartData(28);
      const orderChart28Days = await this.getOrderCountChartData(28);

      return {
        summary: {
          orders: totalOrders,
          revenue: Number(totalRevenue),
          products: totalProducts,
          customers: totalCustomers,
        },
        recentOrders: recentOrders.map((order) => ({
          id: order.code,
          customerName: order.customer?.name || order.customer?.email || 'Khách vãng lai',
          total: Number(order.totalAmount),
          status: order.status,
          paymentStatus: order.paymentStatus,
          date: order.createdAt,
        })),
        lowStock: lowStockVariants.map((v) => ({
          name: `${v.product.name} ${v.name ? `(${v.name})` : ''}`.trim(),
          stock: v.stock,
        })),

        // TRẢ VỀ CÁC BỘ DỮ LIỆU CHO FRONTEND
        chartData: chartData7Days, // Giữ biến cũ để không gây lỗi
        chartData7: chartData7Days,
        chartData28: chartData28Days,
        orderChart28: orderChart28Days,
      };
    } catch (error) {
      this.logger.error('Lỗi khi lấy dữ liệu thống kê dashboard:', error);
      throw new InternalServerErrorException(
        this.i18n.t('dashboard.error.internal_server_error', {
          defaultValue: 'Đã xảy ra lỗi khi tải dữ liệu thống kê.',
        }),
      );
    }
  }

  // HÀM TÍNH DOANH THU ĐỘNG THEO SỐ NGÀY Truyền vào (Dựa trên PAID)
  private async getRevenueChartData(days: number) {
    const today = dayjs().endOf('day');
    const pastDay = dayjs().subtract(days - 1, 'day').startOf('day');

    const orders = await this.prisma.order.findMany({
      where: {
        createdAt: { gte: pastDay.toDate(), lte: today.toDate() },
        paymentStatus: PaymentStatus.PAID, 
      },
      select: {
        createdAt: true,
        totalAmount: true,
      },
    });

    const daysMap = new Map<string, number>();
    for (let i = 0; i < days; i++) {
      const dateStr = pastDay.add(i, 'day').format('DD/MM');
      daysMap.set(dateStr, 0);
    }

    orders.forEach((order) => {
      const dateStr = dayjs(order.createdAt).format('DD/MM');
      if (daysMap.has(dateStr)) {
        daysMap.set(dateStr, daysMap.get(dateStr)! + Number(order.totalAmount));
      }
    });

    return Array.from(daysMap.entries()).map(([name, total]) => ({ name, total }));
  }

  // HÀM TÍNH SỐ LƯỢNG ĐƠN HÀNG ĐỘNG (Bỏ qua đơn CANCELLED)
  private async getOrderCountChartData(days: number) {
    const today = dayjs().endOf('day');
    const pastDay = dayjs().subtract(days - 1, 'day').startOf('day');

    const orders = await this.prisma.order.findMany({
      where: {
        createdAt: { gte: pastDay.toDate(), lte: today.toDate() },
        status: { 
          in: [OrderStatus.PENDING, OrderStatus.PROCESSING, OrderStatus.SHIPPING, OrderStatus.DELIVERED] 
        },
      },
      select: { createdAt: true }, // Chỉ cần lấy ngày tạo để đếm
    });

    const daysMap = new Map<string, number>();
    for (let i = 0; i < days; i++) {
      const dateStr = pastDay.add(i, 'day').format('DD/MM');
      daysMap.set(dateStr, 0);
    }

    orders.forEach((order) => {
      const dateStr = dayjs(order.createdAt).format('DD/MM');
      if (daysMap.has(dateStr)) {
        daysMap.set(dateStr, daysMap.get(dateStr)! + 1); // Đếm 1 đơn hàng
      }
    });

    return Array.from(daysMap.entries()).map(([name, total]) => ({ name, total }));
  }
}