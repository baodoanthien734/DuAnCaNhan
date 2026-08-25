import { Injectable, InternalServerErrorException, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { I18nService } from 'nestjs-i18n';
import { OrderStatus, ProductStatus } from '@prisma/client';
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
      // 1. Thống kê tổng quan (Giữ nguyên)
      const totalOrders = await this.prisma.order.count();
      const revenueAggregation = await this.prisma.order.aggregate({
        _sum: { totalAmount: true },
        where: { status: { not: OrderStatus.CANCELLED } },
      });
      const totalRevenue = revenueAggregation._sum.totalAmount || 0;
      const totalProducts = await this.prisma.product.count({
        where: { status: ProductStatus.ACTIVE },
      });
      const totalCustomers = await this.prisma.user.count({
        where: { roles: { none: { name: { in: ['ADMIN', 'MANAGER'] } } } },
      });

      // 2. Lấy 5 đơn hàng mới nhất
      const recentOrders = await this.prisma.order.findMany({
        take: 5,
        orderBy: { createdAt: 'desc' },
        include: {
          customer: { select: { name: true, email: true } },
        },
      });

      // 3. Cảnh báo sản phẩm/biến thể sắp hết hàng (stock <= 5)
      const lowStockVariants = await this.prisma.productVariant.findMany({
        where: { stock: { lte: 5 } },
        take: 5,
        include: {
          product: { select: { name: true } },
        },
      });

      // 4. Dữ liệu biểu đồ doanh thu 7 ngày qua
      const chartData = await this.getRevenueChartData();

      // Trả về Payload tổng hợp
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
          date: order.createdAt,
        })),
        lowStock: lowStockVariants.map((v) => ({
          name: `${v.product.name} ${v.name ? `(${v.name})` : ''}`.trim(),
          stock: v.stock,
        })),
        chartData,
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

  // Hàm phụ: Tính doanh thu 7 ngày
  private async getRevenueChartData() {
    const today = dayjs().endOf('day');
    const sevenDaysAgo = dayjs().subtract(6, 'day').startOf('day');

    const orders = await this.prisma.order.findMany({
      where: {
        createdAt: { gte: sevenDaysAgo.toDate(), lte: today.toDate() },
        status: { not: OrderStatus.CANCELLED },
      },
      select: {
        createdAt: true,
        totalAmount: true,
      },
    });

    // Tạo mảng 7 ngày rỗng
    const daysMap = new Map<string, number>();
    for (let i = 0; i < 7; i++) {
      const dateStr = sevenDaysAgo.add(i, 'day').format('DD/MM');
      daysMap.set(dateStr, 0);
    }

    // Cộng dồn doanh thu
    orders.forEach((order) => {
      const dateStr = dayjs(order.createdAt).format('DD/MM');
      if (daysMap.has(dateStr)) {
        daysMap.set(dateStr, daysMap.get(dateStr)! + Number(order.totalAmount));
      }
    });

    return Array.from(daysMap.entries()).map(([name, total]) => ({ name, total }));
  }
}