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
      // 1. Đếm tổng số đơn hàng
      const totalOrders = await this.prisma.order.count();

      // 2. Tính tổng doanh thu (Chỉ tính các đơn chưa bị hủy)
      const revenueAggregation = await this.prisma.order.aggregate({
        _sum: { totalAmount: true },
        where: { 
          status: { not: OrderStatus.CANCELLED } 
        }, 
      });
      const totalRevenue = revenueAggregation._sum.totalAmount || 0;

      // 3. Đếm tổng số sản phẩm đang hoạt động (ACTIVE)
      const totalProducts = await this.prisma.product.count({
        where: { 
          status: ProductStatus.ACTIVE 
        },
      });

      // 4. Đếm tổng số khách hàng (Loại trừ các tài khoản có Role ADMIN / MANAGER)
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
      
      // Đã đổi sang namespace 'dashboard' khớp với file dashboard.json
      throw new InternalServerErrorException(
        this.i18n.t('dashboard.error.internal_server_error', { 
          defaultValue: 'Đã xảy ra lỗi khi tải dữ liệu thống kê.' 
        })
      );
    }
  }
}