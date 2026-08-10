import { Injectable, InternalServerErrorException, NotFoundException } from '@nestjs/common';
import { OrderStatus, Prisma } from '@prisma/client';
import { I18nService } from 'nestjs-i18n';
import { PrismaService } from '../prisma/prisma.service';

type AdminCustomersListQuery = {
  q?: string;
  skip?: number;
  take?: number;
};

@Injectable()
export class AdminCustomersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly i18n: I18nService,
  ) {}

  private getCustomerOnlyWhere(): Prisma.UserWhereInput {
    return {
      roles: {
        some: { name: 'CUSTOMER' },
        none: { name: 'ADMIN' },
      },
    };
  }

  async findAll(query: AdminCustomersListQuery) {
    try {
      const where: Prisma.UserWhereInput = {
        AND: [
          this.getCustomerOnlyWhere(),
          query.q
            ? {
                OR: [
                  { name: { contains: query.q, mode: 'insensitive' } },
                  { email: { contains: query.q, mode: 'insensitive' } },
                ],
              }
            : {},
        ],
      };

      const skip = query.skip ?? 0;
      const take = query.take ?? 20;

      const [users, total] = await this.prisma.$transaction([
        this.prisma.user.findMany({
          where,
          skip,
          take,
          orderBy: { createdAt: 'desc' },
          select: {
            id: true,
            name: true,
            email: true,
            isActive: true,
            createdAt: true,
            _count: {
              select: { orders: true },
            },
          },
        }),
        this.prisma.user.count({ where }),
      ]);

      const customerIds = users.map((user) => user.id);
      const deliveredTotals =
        customerIds.length > 0
          ? await this.prisma.order.groupBy({
              by: ['customerId'],
              where: {
                customerId: { in: customerIds },
                status: OrderStatus.DELIVERED,
              },
              _sum: { totalAmount: true },
            })
          : [];

      const totalSpentMap = new Map<number, number>(
        deliveredTotals.map((row) => [row.customerId, Number(row._sum.totalAmount ?? 0)]),
      );

      const items = users.map((user) => ({
        id: user.id,
        name: user.name,
        email: user.email,
        isActive: user.isActive,
        createdAt: user.createdAt,
        orderCount: user._count.orders,
        totalSpent: totalSpentMap.get(user.id) ?? 0,
      }));

      return { items, total };
    } catch {
      throw new InternalServerErrorException(this.i18n.t('admin_customers.error.fetch_failed'));
    }
  }

  async findOne(id: number) {
    try {
      const customer = await this.prisma.user.findFirst({
        where: {
          id,
          ...this.getCustomerOnlyWhere(),
        },
        include: {
          roles: true,
          addresses: {
            orderBy: [{ isDefault: 'desc' }, { id: 'desc' }],
          },
          orders: {
            orderBy: { createdAt: 'desc' },
            include: {
              items: true,
              address: true,
            },
          },
          reviews: {
            orderBy: { createdAt: 'desc' },
            include: {
              product: {
                select: {
                  id: true,
                  name: true,
                  slug: true,
                },
              },
            },
          },
          accounts: true,
          logs: {
            orderBy: { createdAt: 'desc' },
          },
        },
      });

      if (!customer) {
        throw new NotFoundException(this.i18n.t('admin_customers.error.customer_not_found'));
      }

      return customer;
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new InternalServerErrorException(this.i18n.t('admin_customers.error.fetch_failed'));
    }
  }

  async toggleStatus(customerId: number, adminId: number) {
    try {
      const customer = await this.prisma.user.findFirst({
        where: {
          id: customerId,
          ...this.getCustomerOnlyWhere(),
        },
        select: {
          id: true,
          isActive: true,
          email: true,
        },
      });

      if (!customer) {
        throw new NotFoundException(this.i18n.t('admin_customers.error.customer_not_found'));
      }

      const nextStatus = !customer.isActive;

      const updatedCustomer = await this.prisma.$transaction(async (tx) => {
        if (!nextStatus) {
          await tx.account.updateMany({
            where: { userId: customerId },
            data: {
              access_token: null,
              refresh_token: null,
              expires_at: null,
            },
          });
        }

        const updated = await tx.user.update({
          where: { id: customerId },
          data: {
            isActive: nextStatus,
            ...(nextStatus ? {} : { hashedRefreshToken: null }),
          },
          select: {
            id: true,
            name: true,
            email: true,
            isActive: true,
          },
        });

        await tx.auditLog.create({
          data: {
            userId: adminId,
            action: 'ADMIN_TOGGLE_USER_STATUS',
            resource: 'User',
            details: {
              targetUserId: customer.id,
              targetEmail: customer.email,
              isActive: nextStatus,
            },
          },
        });

        return updated;
      });

      return {
        success: true,
        message: this.i18n.t('admin_customers.success.status_updated'),
        data: updatedCustomer,
      };
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new InternalServerErrorException(this.i18n.t('admin_customers.error.toggle_status_failed'));
    }
  }
}
