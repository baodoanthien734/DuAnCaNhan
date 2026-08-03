import { Injectable, Logger, InternalServerErrorException, NotFoundException } from '@nestjs/common';
import { CreateProductDto } from '../dto/core/create-product.dto';
import { FilterProductDto } from '../dto/core/filter-product.dto';
import { PrismaService } from '../../prisma/prisma.service'; 

import { UpdateProductDto } from '../dto/core/update-product.dto';
import { ProductVariantsService } from './product-variants.service';
import { ProductCustomizationsService } from './product-customizations.service';

@Injectable()
export class ProductsService {
  private readonly logger = new Logger(ProductsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private variantsService: ProductVariantsService,
    private customizationsService: ProductCustomizationsService,
  ) {}

  // Hàm helper tự động tạo slug tiếng Việt không dấu
  private generateSlug(text: string): string {
    const baseSlug = text
      .toString()
      .toLowerCase()
      .normalize('NFD') // Tách dấu ra khỏi chữ
      .replace(/[\u0300-\u036f]/g, '') // Xóa dấu
      .replace(/đ/g, 'd').replace(/Đ/g, 'D') // Xử lý chữ Đ
      .replace(/\s+/g, '-') // Thay khoảng trắng bằng gạch ngang
      .replace(/[^\w\-]+/g, '') // Xóa các ký tự đặc biệt
      .replace(/\-\-+/g, '-') // Xóa các gạch ngang liên tiếp
      .replace(/^-+/, '') // Xóa gạch ngang ở đầu
      .replace(/-+$/, ''); // Xóa gạch ngang ở cuối
      
    // Gắn thêm timestamp để đảm bảo tính Unique
    return `${baseSlug}-${Date.now()}`;
  }

  async create(createProductDto: CreateProductDto) {
    this.logger.log(`Bắt đầu tạo sản phẩm: ${createProductDto.name}`);

    try {
      const newProduct = await this.prisma.$transaction(async (tx) => {
        
        // Tạo slug từ tên sản phẩm
        const productSlug = this.generateSlug(createProductDto.name);

        // 1. Lưu thông tin cơ bản
        const product = await tx.product.create({
          data: {
            name: createProductDto.name,
            slug: productSlug, // Bổ sung trường slug còn thiếu
            categoryId: createProductDto.categoryId,
            description: createProductDto.description,
            basePrice: createProductDto.basePrice,
            images: createProductDto.images || [],
            isPrivate: createProductDto.isPrivate || false,
            privateForUserId: createProductDto.privateForUserId,
            status: createProductDto.status || 'ACTIVE',
          },
        });

        // 2. Lưu mảng Biến thể
        if (createProductDto.variants && createProductDto.variants.length > 0) {
          await tx.productVariant.createMany({
            data: createProductDto.variants.map((v) => ({
              productId: product.id,
              name: v.name,
              sku: v.sku,
              price: v.price,
              stock: v.stock || 0,
              image: v.image,
            })),
          });
        }

        // 3. Lưu mảng Cá nhân hóa
        if (createProductDto.customizations && createProductDto.customizations.length > 0) {
          for (const custom of createProductDto.customizations) {
            await tx.productCustomization.create({
              data: {
                productId: product.id,
                name: custom.name,
                type: custom.type,
                isRequired: custom.isRequired || false,
                maxLength: custom.maxLength,
                choices: custom.choices && custom.choices.length > 0
                  ? {
                      create: custom.choices.map((c) => ({
                        label: c.label,
                        extraPrice: c.extraPrice || 0,
                      })),
                    }
                  : undefined,
              },
            });
          }
        }

        return product;
      });

      return {
        success: true,
        message: 'Tạo sản phẩm và các tùy chọn thành công vào Database',
        data: newProduct,
      };

    } catch (error) {
      this.logger.error('Lỗi Database khi tạo sản phẩm:', error);
      throw new InternalServerErrorException('Lỗi hệ thống khi lưu sản phẩm, vui lòng thử lại');
    }
  }

  async findAll(query: FilterProductDto) {
    const { q, categoryId, status, skip, take } = query;
    const where: any = {};

    // 1 & 2. Đồng bộ logic tìm kiếm: Tìm trên cả name và slug, không phân biệt hoa thường
    if (q) {
      where.OR = [
        { name: { contains: q, mode: 'insensitive' } },
        { slug: { contains: q, mode: 'insensitive' } }
      ];
    }
    
    if (categoryId) {
      where.categoryId = categoryId;
    }
    
    if (status) {
      where.status = status;
    }

    // 3. Đồng bộ logic bất đồng bộ: Dùng $transaction thay vì Promise.all
    const [items, total] = await this.prisma.$transaction([
      this.prisma.product.findMany({
        where,
        skip,
        take,
        orderBy: { createdAt: 'desc' },
        include: { 
          category: true,
          variants: true,
          customizations: {
            include: { choices: true } 
          },
        },
      }),
      this.prisma.product.count({ where }),
    ]);

    return { items, total };
  }

  // Cập nhật trạng thái nhanh (Toggle Active/Draft)
  async updateStatus(id: number, status: any) {
    const product = await this.prisma.product.findUnique({ where: { id } });
    if (!product) throw new NotFoundException('Sản phẩm không tồn tại');
    
    return this.prisma.product.update({
      where: { id },
      data: { status }
    });
  }

  // Xóa mềm (Chuyển thành ARCHIVED)
  async remove(id: number) {
    const product = await this.prisma.product.findUnique({ where: { id } });
    if (!product) throw new NotFoundException('Sản phẩm không tồn tại');

    return this.prisma.product.update({
      where: { id },
      data: { status: 'ARCHIVED' }
    });
  }

  async findOne(id: number) {
    const product = await this.prisma.product.findUnique({
      where: { id },
      include: {
        category: true,
        variants: true, // Lấy toàn bộ phân loại (size, màu sắc...)
        customizations: {
          include: {
            choices: true, // Bắt buộc phải lồng thêm include này để lấy được mảng các lựa chọn (và extraPrice) bên trong
          },
        },
      },
    });

    if (!product) {
      throw new NotFoundException(`Không tìm thấy sản phẩm với ID: ${id}`);
    }

    return product;
  }

  async update(id: number, dto: UpdateProductDto) {
    // 1. Kiểm tra xem sản phẩm có tồn tại không (tái sử dụng hàm findOne)
    await this.findOne(id);

    // 2. Bóc tách dữ liệu: Tách mảng con ra khỏi các trường cơ bản của Product
    const { variants, customizations, ...productData } = dto as any;

    // 3. Cập nhật các trường cơ bản của bảng Product (name, price, images...)
    await this.prisma.product.update({
      where: { id },
      data: productData,
    });

    // 4. Ủy quyền đồng bộ (Sync) mảng con cho các Service chuyên trách
    if (variants) {
      await this.variantsService.syncVariants(id, variants);
    }

    if (customizations) {
      await this.customizationsService.syncCustomizations(id, customizations);
    }

    // 5. Trả về dữ liệu mới nhất, đầy đủ nhất sau khi đã cập nhật xong
    return this.findOne(id);
  }
}