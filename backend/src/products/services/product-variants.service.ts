/**
 * @fileoverview Service quản lý đồng bộ biến thể sản phẩm (Product Variants)
 * 
 * Chức năng chính:
 * - Sync variants từ frontend vào database
 * - Thêm mới variant chưa có ID
 * - Cập nhật variant đã có ID
 * - Xóa variant không còn trong danh sách gửi lên
 * 
 * Thuật toán đồng bộ:
 * 1. Lọc danh sách ID từ variants được gửi lên
 * 2. Xóa các variant trong DB không có trong danh sách ID (DELETE cũ)
 * 3. Duyệt qua variants gửi lên:
 *    - Có ID → UPDATE
 *    - Không có ID → CREATE
 */
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class ProductVariantsService {
  constructor(private prisma: PrismaService) {}

  // Thuật toán đồng bộ mảng Variants
  async syncVariants(productId: number, variantsData: any[]) {
    // Nếu frontend không gửi mảng (undefined), bỏ qua
    if (!variantsData) return;

    // 1. Lọc lấy danh sách các ID được gửi lên từ Frontend
    const incomingIds = variantsData
      .filter((v) => v.id)
      .map((v) => v.id);

    // 2. XÓA: Xóa các biến thể cũ trong DB không còn nằm trong danh sách gửi lên
    await this.prisma.productVariant.deleteMany({
      where: {
        productId: productId,
        id: { notIn: incomingIds.length > 0 ? incomingIds : [0] }, // Nếu mảng rỗng, cho ID notIn [0] để xóa hết
      },
    });

    // 3. THÊM MỚI & CẬP NHẬT
    for (const variant of variantsData) {
      if (variant.id) {
        // Có ID -> Cập nhật bản ghi hiện tại
        await this.prisma.productVariant.update({
          where: { id: variant.id },
          data: {
            name: variant.name,
            sku: variant.sku,
            price: variant.price,
            stock: variant.stock,
          },
        });
      } else {
        // Không có ID -> Tạo bản ghi mới
        await this.prisma.productVariant.create({
          data: {
            productId: productId,
            name: variant.name,
            sku: variant.sku,
            price: variant.price,
            stock: variant.stock,
          },
        });
      }
    }
  }
}