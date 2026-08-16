import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { I18nService } from 'nestjs-i18n';
import { CreateProductDto } from '../dto/core/create-product.dto';
import { FilterProductDto } from '../dto/core/filter-product.dto';
import { PrismaService } from '../../prisma/prisma.service';
import { UpdateProductDto } from '../dto/core/update-product.dto';
import { ProductCustomizationsService } from './product-customizations.service';
import { basename, dirname, join, resolve } from 'path';
import { promises as fs } from 'fs';

@Injectable()
export class ProductsService {
  private readonly logger = new Logger(ProductsService.name);
  private readonly publicRootDir = resolve(process.cwd(), 'public');
  private readonly productsRootDir = resolve(process.cwd(), 'public', 'uploads', 'products');

  constructor(
    private readonly prisma: PrismaService,
    private readonly customizationsService: ProductCustomizationsService,
    private readonly i18n: I18nService,
  ) {}

  // 1. Hàm chuẩn hóa chuỗi tiếng Việt
  private slugify(text: string) {
    return text
      .toString()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/đ/g, 'd').replace(/Đ/g, 'D')
      .toLowerCase()
      .trim()
      .replace(/\s+/g, '-')
      .replace(/[^a-z0-9\-]/g, '')
      .replace(/\-+/g, '-');
  }

  // 2. Hàm tự động sinh Slug (thêm -1, -2 nếu trùng)
  private async generateAutoSlug(name: string, currentId?: number): Promise<string> {
    const baseSlug = this.slugify(name);
    let slug = baseSlug;
    let counter = 1;

    while (true) {
      const existing = await this.prisma.product.findFirst({ where: { slug } });
      if (!existing || existing.id === currentId) {
        return slug;
      }
      slug = `${baseSlug}-${counter}`;
      counter++;
    }
  }

  // 3. Hàm kiểm tra Admin nhập tay
  private async checkManualSlug(slug: string, currentId?: number): Promise<void> {
    const existing = await this.prisma.product.findFirst({ where: { slug } });
    if (existing && existing.id !== currentId) {
      throw new BadRequestException(this.i18n.t('products.error.duplicate_slug'));
    }
  }

  private toNumber(value: unknown): number {
    if (typeof value === 'number') return value;
    return Number(value || 0);
  }

  private assertMainImagesLimit(images?: string[]) {
    if ((images || []).length > 5) {
      throw new BadRequestException(this.i18n.t('products.error.product_images_limit_exceeded'));
    }
  }

  private assertVariantPrices(basePrice: number, variants?: Array<{ price?: number }>) {
    if (!variants || variants.length === 0) return;

    for (const variant of variants) {
      const variantPrice = this.toNumber(variant.price);
      if (variantPrice < basePrice) {
        throw new BadRequestException(
          this.i18n.t('products.error.variant_price_must_be_greater_or_equal_base', {
            args: { basePrice },
          }),
        );
      }
    }
  }

  private parseProductUploadPath(imageUrl: string): { relative: string; absolute: string } | null {
    if (!imageUrl) return null;

    let pathname = imageUrl.trim();

    try {
      if (/^https?:\/\//i.test(pathname)) {
        pathname = new URL(pathname).pathname;
      }
    } catch {
      return null;
    }

    pathname = pathname.split('?')[0].replace(/^\/+/, '');
    if (!pathname.startsWith('uploads/products/') && !pathname.startsWith('uploads/tmp/')) {
      return null;
    }

    const absolute = resolve(this.publicRootDir, pathname);
    if (!absolute.startsWith(this.publicRootDir)) {
      return null;
    }

    return { relative: pathname, absolute };
  }

  private async ensureDir(path: string) {
    await fs.mkdir(path, { recursive: true });
  }

  private async moveFileSafe(from: string, to: string) {
    await this.ensureDir(dirname(to));

    if (from === to) return;

    try {
      await fs.rename(from, to);
      return;
    } catch (error: any) {
      if (error?.code === 'EXDEV') {
        await fs.copyFile(from, to);
        await fs.unlink(from).catch(() => undefined);
        return;
      }
      throw error;
    }
  }

  private async removeFileSafe(filePath: string) {
    try {
      await fs.unlink(filePath);
    } catch (error: any) {
      if (error?.code !== 'ENOENT') {
        this.logger.warn(`Could not remove file ${filePath}: ${error?.message}`);
      }
    }
  }

  private async removeEmptyDirSafe(dirPath: string) {
    try {
      const entries = await fs.readdir(dirPath);
      if (entries.length === 0) {
        await fs.rmdir(dirPath);
      }
    } catch {
      // ignore
    }
  }

  private async moveImageToProductDir(productId: number, imageUrl: string) {
    const parsed = this.parseProductUploadPath(imageUrl);
    if (!parsed) return imageUrl;

    const filename = basename(parsed.relative);
    const targetRelative = `uploads/products/${productId}-products/${filename}`;
    const targetAbsolute = resolve(this.publicRootDir, targetRelative);

    if (parsed.relative === targetRelative) {
      return `/${targetRelative}`;
    }

    await this.moveFileSafe(parsed.absolute, targetAbsolute);
    const sourceDir = dirname(parsed.absolute);
    if (sourceDir !== resolve(this.publicRootDir, 'uploads', 'tmp')) {
      await this.removeEmptyDirSafe(sourceDir);
    }
    return `/${targetRelative}`;
  }

  private async moveImageToVariantDir(productId: number, variantId: number, imageUrl: string) {
    const parsed = this.parseProductUploadPath(imageUrl);
    if (!parsed) return imageUrl;

    const filename = basename(parsed.relative);
    const targetRelative = `uploads/products/${productId}-products/${variantId}-variant/${filename}`;
    const targetAbsolute = resolve(this.publicRootDir, targetRelative);

    if (parsed.relative === targetRelative) {
      return `/${targetRelative}`;
    }

    await this.moveFileSafe(parsed.absolute, targetAbsolute);
    const sourceDir = dirname(parsed.absolute);
    if (sourceDir !== resolve(this.publicRootDir, 'uploads', 'tmp')) {
      await this.removeEmptyDirSafe(sourceDir);
    }
    return `/${targetRelative}`;
  }

  private async cleanupProductImageUrls(imageUrls: string[]) {
    for (const imageUrl of imageUrls) {
      const parsed = this.parseProductUploadPath(imageUrl);
      if (!parsed) continue;

      await this.removeFileSafe(parsed.absolute);
      const sourceDir = dirname(parsed.absolute);
      if (sourceDir !== resolve(this.publicRootDir, 'uploads', 'tmp')) {
        await this.removeEmptyDirSafe(sourceDir);
      }
    }
  }

  private async syncVariants(productId: number, variantsData: any[], currentBasePrice: number) {
    const existingVariants = await this.prisma.productVariant.findMany({
      where: { productId },
      select: { id: true, image: true },
    });

    const existingById = new Map(existingVariants.map((variant) => [variant.id, variant]));

    const incomingIds = variantsData.filter((variant) => variant.id).map((variant) => Number(variant.id));
    const toDelete = existingVariants.filter((variant) => !incomingIds.includes(variant.id));

    if (toDelete.length > 0) {
      await this.prisma.productVariant.deleteMany({
        where: {
          productId,
          id: { in: toDelete.map((variant) => variant.id) },
        },
      });

      await this.cleanupProductImageUrls(
        toDelete.map((variant) => variant.image).filter((image): image is string => Boolean(image)),
      );
    }

    for (const variant of variantsData) {
      const price = this.toNumber(variant.price);
      if (price < currentBasePrice) {
        throw new BadRequestException(
          this.i18n.t('products.error.variant_price_must_be_greater_or_equal_base', {
            args: { basePrice: currentBasePrice },
          }),
        );
      }

      if (variant.id) {
        const variantId = Number(variant.id);
        const previous = existingById.get(variantId);

        let finalImage: string | null = variant.image ?? null;
        if (typeof finalImage === 'string' && finalImage.trim().length > 0) {
          finalImage = await this.moveImageToVariantDir(productId, variantId, finalImage);
        }

        await this.prisma.productVariant.update({
          where: { id: variantId },
          data: {
            name: variant.name,
            sku: variant.sku,
            price,
            stock: this.toNumber(variant.stock),
            image: finalImage,
          },
        });

        if (previous?.image && previous.image !== finalImage) {
          await this.cleanupProductImageUrls([previous.image]);
        }
      } else {
        const created = await this.prisma.productVariant.create({
          data: {
            productId,
            name: variant.name,
            sku: variant.sku,
            price,
            stock: this.toNumber(variant.stock),
            image: null,
          },
        });

        let finalImage: string | null = variant.image ?? null;
        if (typeof finalImage === 'string' && finalImage.trim().length > 0) {
          finalImage = await this.moveImageToVariantDir(productId, created.id, finalImage);
          await this.prisma.productVariant.update({
            where: { id: created.id },
            data: { image: finalImage },
          });
        }
      }
    }
  }

  async create(createProductDto: CreateProductDto) {
    this.logger.log(`Bắt đầu tạo sản phẩm: ${createProductDto.name}`);

    const basePrice = this.toNumber(createProductDto.basePrice);
    this.assertMainImagesLimit(createProductDto.images);
    this.assertVariantPrices(basePrice, createProductDto.variants);

    try {
      // ==========================================
      // LOGIC XỬ LÝ SLUG CHO CREATE
      // ==========================================
      let finalSlug = '';
      if (!createProductDto.slug) {
        // Admin bỏ trống -> Tự sinh
        finalSlug = await this.generateAutoSlug(createProductDto.name);
      } else {
        // Admin nhập tay -> Chuẩn hóa và kiểm tra trùng
        finalSlug = this.slugify(createProductDto.slug);
        await this.checkManualSlug(finalSlug);
      }

      const product = await this.prisma.product.create({
        data: {
          name: createProductDto.name,
          slug: finalSlug, // Dùng Slug mới thay vì cái cũ
          categoryId: createProductDto.categoryId,
          description: createProductDto.description,
          basePrice: createProductDto.basePrice,
          images: [],
          isPrivate: createProductDto.isPrivate || false,
          privateForUserId: createProductDto.privateForUserId,
          status: createProductDto.status || 'ACTIVE',
        },
      });

      const finalProductImages = await Promise.all(
        (createProductDto.images || []).map((url) => this.moveImageToProductDir(product.id, url)),
      );

      await this.prisma.product.update({
        where: { id: product.id },
        data: { images: finalProductImages },
      });

      if (createProductDto.variants && createProductDto.variants.length > 0) {
        await this.syncVariants(product.id, createProductDto.variants, basePrice);
      }

      if (createProductDto.customizations && createProductDto.customizations.length > 0) {
        for (const custom of createProductDto.customizations) {
          await this.prisma.productCustomization.create({
            data: {
              productId: product.id,
              name: custom.name,
              type: custom.type,
              isRequired: custom.isRequired || false,
              maxLength: custom.maxLength,
              extraPrice: custom.extraPrice || 0,
              choices:
                custom.choices && custom.choices.length > 0
                  ? {
                      create: custom.choices.map((choice) => ({
                        label: choice.label,
                        extraPrice: choice.extraPrice || 0,
                      })),
                    }
                  : undefined,
            },
          });
        }
      }

      return {
        success: true,
        message: this.i18n.t('products.success.product_created'),
        data: await this.findOne(product.id),
      };
    } catch (error) {
      if (error instanceof BadRequestException || error instanceof NotFoundException) {
        throw error;
      }
      this.logger.error('Lỗi Database khi tạo sản phẩm:', error instanceof Error ? error.stack : undefined);
      throw new InternalServerErrorException(this.i18n.t('products.error.product_save_failed'));
    }
  }

  async findAll(query: FilterProductDto) {
    const { q, categoryId, status, skip, take } = query;
    const where: any = {};

    if (q) {
      where.OR = [
        { name: { contains: q, mode: 'insensitive' } },
        { slug: { contains: q, mode: 'insensitive' } },
      ];
    }

    if (categoryId) {
      where.categoryId = categoryId;
    }

    if (status) {
      where.status = status;
    }

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
            include: { choices: true },
          },
        },
      }),
      this.prisma.product.count({ where }),
    ]);

    return { items, total };
  }

  async updateStatus(id: number, status: any) {
    const product = await this.prisma.product.findUnique({ where: { id } });
    if (!product) throw new NotFoundException(this.i18n.t('products.error.product_not_found'));

    return this.prisma.product.update({
      where: { id },
      data: { status },
    });
  }

  async remove(id: number) {
    const product = await this.prisma.product.findUnique({ where: { id } });
    if (!product) throw new NotFoundException(this.i18n.t('products.error.product_not_found'));

    return this.prisma.product.update({
      where: { id },
      data: { status: 'ARCHIVED' },
    });
  }

  async findOne(id: number) {
    const product = await this.prisma.product.findUnique({
      where: { id },
      include: {
        category: true,
        variants: true,
        customizations: {
          include: {
            choices: true,
          },
        },
      },
    });

    if (!product) {
      throw new NotFoundException(this.i18n.t('products.error.product_not_found_with_id', { args: { id } }));
    }

    return product;
  }

  async update(id: number, dto: UpdateProductDto) {
    const existing = await this.findOne(id);

    const nextBasePrice = this.toNumber(dto.basePrice ?? existing.basePrice);
    this.assertMainImagesLimit(dto.images ?? existing.images);

    if (dto.variants) {
      this.assertVariantPrices(nextBasePrice, dto.variants);
    }

    // Tách riêng `slug` ra khỏi productData để xử lý
    const { variants, customizations, images, slug, ...productData } = dto as any;

    // ==========================================
    // LOGIC XỬ LÝ SLUG THÔNG MINH CHO UPDATE
    // ==========================================
    let finalSlug = existing.slug;
    
    if (slug !== undefined) {
      if (slug === existing.slug) {
        // Admin không đụng vào ô Slug, nhưng nếu đổi Tên thì tự động đổi Slug theo
        if (dto.name && dto.name !== existing.name) {
          finalSlug = await this.generateAutoSlug(dto.name, id);
        }
      } else if (slug.trim() === '') {
        // Admin cố tình xóa trắng ô Slug -> Lấy Tên sinh lại
        const targetName = dto.name || existing.name;
        finalSlug = await this.generateAutoSlug(targetName, id);
      } else {
        // Admin chủ ý gõ một Slug mới hoàn toàn
        finalSlug = this.slugify(slug);
        await this.checkManualSlug(finalSlug, id);
      }
    } else {
      // Đề phòng trường hợp Frontend không gửi trường slug lên, vẫn tự động bám theo tên
      if (dto.name && dto.name !== existing.name) {
        finalSlug = await this.generateAutoSlug(dto.name, id);
      }
    }

    const incomingImages = images !== undefined ? images : existing.images;
    const finalProductImages = await Promise.all(
      incomingImages.map((url: string) => this.moveImageToProductDir(id, url)),
    );

    const removedProductImages = existing.images.filter((url) => !finalProductImages.includes(url));

    await this.prisma.product.update({
      where: { id },
      data: {
        ...productData,
        slug: finalSlug, // Truyền Slug đã được xử lý thông minh vào DB
        images: finalProductImages,
      },
    });

    if (variants) {
      await this.syncVariants(id, variants, nextBasePrice);
    }

    if (customizations) {
      await this.customizationsService.syncCustomizations(id, customizations);
    }

    await this.cleanupProductImageUrls(removedProductImages);

    return this.findOne(id);
  }

  async findAllPublic(query: { q?: string; categoryId?: string; skip?: number; take?: number }) {
    const { q, categoryId, skip, take } = query;
    
    // 1. Khóa chặt ĐIỀU KIỆN GỐC: Chỉ lấy sản phẩm ACTIVE và KHÔNG NẰM TRONG danh mục hệ thống
    const where: any = { 
      status: 'ACTIVE',
      category: {
        isSystem: false 
      }
    };

    if (q) {
      where.OR = [
        { name: { contains: q, mode: 'insensitive' } },
        { slug: { contains: q, mode: 'insensitive' } },
      ];
    }

    // 2. Logic gom nhóm ID (Cha + Tất cả các Lá)
    if (categoryId && typeof categoryId === 'string' && categoryId.trim() !== '') {
      
      // Tách chuỗi, ép kiểu sang số và vứt bỏ các giá trị lỗi NaN
      const targetIds = categoryId.split(',').map(id => Number(id)).filter(id => !isNaN(id));

      if (targetIds.length > 0) {
        const allCategories = await this.prisma.category.findMany({
          where: { isSystem: false }
        });

        const getSubCategoryIds = (parentId: number, allCats: any[]): number[] => {
          const children = allCats.filter(c => c.parentId === parentId);
          const subIds = children.map(c => c.id);
          children.forEach(child => {
            subIds.push(...getSubCategoryIds(child.id, allCats));
          });
          return subIds;
        };

        const validCategoryIds = new Set<number>();
        
        // Quét đệ quy cho từng ID được truyền xuống
        targetIds.forEach(targetId => {
          validCategoryIds.add(targetId);
          const subIds = getSubCategoryIds(targetId, allCategories);
          subIds.forEach(subId => validCategoryIds.add(subId));
        });
        
        // Nhồi mảng ID an toàn vào bộ lọc
        where.categoryId = { in: Array.from(validCategoryIds) };
      }
    }
    
    const [items, total] = await this.prisma.$transaction([
      this.prisma.product.findMany({
        where,
        skip: skip ? Number(skip) : 0,
        take: take ? Number(take) : 12,
        orderBy: { createdAt: 'desc' },
        include: {
          category: true,
          variants: true,
          customizations: {
            include: { choices: true },
          },
        },
      }),
      this.prisma.product.count({ where }),
    ]);

    return { items, total };
  }

  async findOneBySlug(slug: string) {
    const product = await this.prisma.product.findFirst({
      where: { slug, status: 'ACTIVE' },
      include: {
        category: true,
        variants: true,
        customizations: {
          include: { choices: true },
        },
      },
    });

    if (!product) {
      throw new NotFoundException(this.i18n.t('products.error.product_not_found'));
    }

    return product;
  }
}
