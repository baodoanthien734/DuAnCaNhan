/**
 * @fileoverview Service cung cấp số liệu thống kê cho Admin Dashboard
 * 
 * Chức năng chính:
 * - Tổng số đơn hàng (totalOrders)
 * - Tổng doanh thu (totalRevenue) - chỉ tính đơn chưa bị hủy
 * - Tổng số sản phẩm đang active (totalProducts)
 * - Tổng số khách hàng (totalCustomers) - loại trừ ADMIN, MANAGER
 * 
 * Use case: Hiển thị cards thống kê trên trang admin dashboard
 */
import { Injectable, InternalServerErrorException, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { I18nService } from 'nestjs-i18n';
import { OrderStatus, ProductStatus } from '@prisma/client'; // Import Enum từ Prisma

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

      const revenueAggregation = await this.prisma.order.aggregate({
        _sum: { totalAmount: true },
        where: { 
          status: { not: OrderStatus.CANCELLED } 
        }, 
      });
      const totalRevenue = revenueAggregation._sum.totalAmount || 0;

      const totalProducts = await this.prisma.product.count({
        where: { 
          status: ProductStatus.ACTIVE 
        },
      });

      const totalCustomers = await this.prisma.user.count({
        where: {
          roles: {
            none: { name: { in: ['ADMIN', 'MANAGER'] } },
          },
        },
      });

      return {
        orders: totalOrders,
        revenue: Number(totalRevenue),
        products: totalProducts,
        customers: totalCustomers,
      };
    } catch (error) {
      this.logger.error('Lỗi khi lấy dữ liệu thống kê dashboard:', error);
      
      throw new InternalServerErrorException(
        this.i18n.t('dashboard.error.internal_server_error', { 
          defaultValue: 'Đã xảy ra lỗi khi tải dữ liệu thống kê.' 
        })
      );
    }
  }
}