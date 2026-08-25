/**
 * @fileoverview Service quản lý sản phẩm với đầy đủ CRUD operations và file management
 * 
 * Chức năng chính:
 * - Quản lý sản phẩm (Create, Read, Update, Delete, Bulk Update)
 * - Quản lý biến thể sản phẩm với SKU tự động sinh hoặc nhập thủ công
 * - Quản lý tùy chọn cá nhân hóa (SELECT, TEXT types)
 * - Upload và quản lý file ảnh sản phẩm với transaction safety
 * - Slug generation với duplicate detection
 * - File moving từ tmp folder đến final destination
 * - Cleanup orphaned files
 * 
 * SKU Handling Strategy:
 * - Tự động sinh: PRODUCTNAME-VARIANTNAME (uppercase, không dấu)
 * - Nhập thủ công: Validate trùng lặp
 * - Đóng băng: Khi update sản phẩm, SKU cũ được giữ nguyên nếu không thay đổi
 * 
 * File Structure:
 * - Products: public/uploads/products/{productId}-products/
 * - Variants: public/uploads/products/{productId}-products/{variantId}-variant/
 */
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

type PendingFileMove = {
  from: string;
  to: string;
  sourceDir: string;
};

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

  // ==============================================================
  // STRING, SLUG & SKU UTILITIES
  // ==============================================================

  private slugify(text: string) {
    return text
      .toString()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/đ/g, 'd')
      .replace(/Đ/g, 'D')
      .toLowerCase()
      .trim()
      .replace(/\s+/g, '-')
      .replace(/[^a-z0-9\-]/g, '')
      .replace(/\-+/g, '-');
  }

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

  private async checkManualSlug(slug: string, currentId?: number): Promise<void> {
    const existing = await this.prisma.product.findFirst({ where: { slug } });
    if (existing && existing.id !== currentId) {
      throw new BadRequestException(this.i18n.t('products.error.duplicate_slug'));
    }
  }

  private async generateAutoSku(productName: string, variantName: string, currentVariantId?: number): Promise<string> {
    const baseSkuText = `${productName}-${variantName}`
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/đ/g, 'd')
      .replace(/Đ/g, 'D')
      .trim()
      .replace(/\s+/g, '-')
      .replace(/[^a-zA-Z0-9\-]/g, '') 
      .replace(/\-+/g, '-')
      .toUpperCase();

    let sku = baseSkuText;
    let counter = 1;

    while (true) {
      const existing = await this.prisma.productVariant.findFirst({ where: { sku } });
      if (!existing || existing.id === currentVariantId) {
        return sku; 
      }
      sku = `${baseSkuText}-${counter}`;
      counter++;
    }
  }

  private async checkManualSku(sku: string, currentVariantId?: number): Promise<void> {
    const existing = await this.prisma.productVariant.findFirst({ where: { sku } });
    if (existing && existing.id !== currentVariantId) {
      throw new BadRequestException(this.i18n.t('products.error.duplicate_sku'));
    }
  }

  // ==============================================================
  // VALIDATION & HELPERS
  // ==============================================================

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

  // ==============================================================
  // FILE SYSTEM MANAGEMENT (UPLOAD & CLEANUP)
  // ==============================================================

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
      await fs.access(from);
    } catch (error) {
      try {
        await fs.access(to);
        return;
      } catch (err) {
        throw new Error(`File không tồn tại ở cả nguồn và đích: ${from}`);
      }
    }

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

  private calculateProductImagePath(productId: number, imageUrl: string): { url: string; fileToMove: PendingFileMove | null } {
    const parsed = this.parseProductUploadPath(imageUrl);
    if (!parsed) return { url: imageUrl, fileToMove: null };

    const filename = basename(parsed.relative);
    const targetRelative = `uploads/products/${productId}-products/${filename}`;
    const targetAbsolute = resolve(this.publicRootDir, targetRelative);

    if (parsed.relative === targetRelative) {
      return { url: `/${targetRelative}`, fileToMove: null };
    }

    return {
      url: `/${targetRelative}`,
      fileToMove: { from: parsed.absolute, to: targetAbsolute, sourceDir: dirname(parsed.absolute) },
    };
  }

  private calculateVariantImagePath(productId: number, variantId: number, imageUrl: string): { url: string; fileToMove: PendingFileMove | null } {
    const parsed = this.parseProductUploadPath(imageUrl);
    if (!parsed) return { url: imageUrl, fileToMove: null };

    const filename = basename(parsed.relative);
    const targetRelative = `uploads/products/${productId}-products/${variantId}-variant/${filename}`;
    const targetAbsolute = resolve(this.publicRootDir, targetRelative);

    if (parsed.relative === targetRelative) {
      return { url: `/${targetRelative}`, fileToMove: null };
    }

    return {
      url: `/${targetRelative}`,
      fileToMove: { from: parsed.absolute, to: targetAbsolute, sourceDir: dirname(parsed.absolute) },
    };
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


  private async syncVariants(
    tx: any, 
    productId: number, 
    productName: string, 
    variantsData: any[], 
    currentBasePrice: number, 
    pendingMoves: PendingFileMove[],
    pendingCleanups: string[]
  ) {
    const existingVariants = await tx.productVariant.findMany({
      where: { productId },
      select: { id: true, image: true, sku: true },
    });

    const existingById = new Map(existingVariants.map((variant: any) => [variant.id, variant]));
    const incomingIds = variantsData.filter((variant: any) => variant.id).map((variant: any) => Number(variant.id));
    const toDelete = existingVariants.filter((variant: any) => !incomingIds.includes(variant.id));

    if (toDelete.length > 0) {
      await tx.productVariant.deleteMany({
        where: {
          productId,
          id: { in: toDelete.map((variant: any) => variant.id) },
        },
      });
      pendingCleanups.push(
        ...toDelete.map((variant: any) => variant.image).filter((image: any): image is string => Boolean(image))
      );
    }

    for (let i = 0; i < variantsData.length; i++) {
      const variant = variantsData[i];
      const price = this.toNumber(variant.price);
      
      if (price < currentBasePrice) {
        throw new BadRequestException(
          this.i18n.t('products.error.variant_price_must_be_greater_or_equal_base', {
            args: { basePrice: currentBasePrice },
          }),
        );
      }

 
      let finalSku = '';
      if (variant.id) {
        const variantId = Number(variant.id);
        const previous: any = existingById.get(variantId);

        if (variant.sku !== undefined) {
          if (variant.sku.trim() === '') {
             // Admin xóa trắng -> Sinh lại SKU mới toanh dựa trên tên
             finalSku = await this.generateAutoSku(productName, variant.name, variantId);
          } else if (previous?.sku && variant.sku.trim().toUpperCase() === previous.sku.toUpperCase()) {
             // Admin không đổi SKU -> Giữ nguyên (Dù tên sản phẩm có đổi)
             finalSku = previous.sku;
          } else {
             // Admin nhập tay mã mới -> Check trùng
             finalSku = variant.sku.trim().toUpperCase();
             await this.checkManualSku(finalSku, variantId);
          }
        } else {
           // Frontend không gửi trường SKU lên -> Giữ nguyên SKU cũ
           finalSku = previous?.sku || await this.generateAutoSku(productName, variant.name, variantId);
        }
      } else {
        if (!variant.sku || variant.sku.trim() === '') {
          // Tạo mới mà để trống -> Tự sinh SKU
          finalSku = await this.generateAutoSku(productName, variant.name);
        } else {
          // Tạo mới mà nhập tay -> Check trùng
          finalSku = variant.sku.trim().toUpperCase();
          await this.checkManualSku(finalSku);
        }
      }

      if (variant.id) {
        const variantId = Number(variant.id);
        const previous: any = existingById.get(variantId);

        let finalImage: string | null = variant.image ?? null;
        if (typeof finalImage === 'string' && finalImage.trim().length > 0) {
          const calc = this.calculateVariantImagePath(productId, variantId, finalImage);
          finalImage = calc.url;
          if (calc.fileToMove) pendingMoves.push(calc.fileToMove);
        }

        await tx.productVariant.update({
          where: { id: variantId },
          data: {
            name: variant.name,
            sku: finalSku, 
            price,
            stock: this.toNumber(variant.stock),
            image: finalImage,
          },
        });

        if (previous?.image && previous.image !== finalImage) {
          pendingCleanups.push(previous.image);
        }
      } else {
        const created = await tx.productVariant.create({
          data: {
            productId,
            name: variant.name,
            sku: finalSku, 
            price,
            stock: this.toNumber(variant.stock),
            image: null,
          },
        });

        let finalImage: string | null = variant.image ?? null;
        if (typeof finalImage === 'string' && finalImage.trim().length > 0) {
          const calc = this.calculateVariantImagePath(productId, created.id, finalImage);
          finalImage = calc.url;
          if (calc.fileToMove) pendingMoves.push(calc.fileToMove);

          await tx.productVariant.update({
            where: { id: created.id },
            data: { image: finalImage },
          });
        }
      }
    }
  }

  // ==============================================================
  // ADMIN FEATURES (CRUD & MANAGEMENT)
  // ==============================================================

  async create(createProductDto: CreateProductDto) {
    this.logger.log(`Bắt đầu tạo sản phẩm: ${createProductDto.name}`);

    const basePrice = this.toNumber(createProductDto.basePrice);
    this.assertMainImagesLimit(createProductDto.images);
    this.assertVariantPrices(basePrice, createProductDto.variants);

    const pendingMoves: PendingFileMove[] = [];

    try {
      let finalSlug = '';
      if (!createProductDto.slug) {
        finalSlug = await this.generateAutoSlug(createProductDto.name);
      } else {
        finalSlug = this.slugify(createProductDto.slug);
        await this.checkManualSlug(finalSlug);
      }

      // THỰC THI TRANSACTION
      const product = await this.prisma.$transaction(async (tx) => {
        const newProduct = await tx.product.create({
          data: {
            name: createProductDto.name,
            slug: finalSlug,
            categoryId: createProductDto.categoryId,
            description: createProductDto.description,
            basePrice: createProductDto.basePrice,
            images: [],
            isPrivate: createProductDto.isPrivate || false,
            privateForUserId: createProductDto.privateForUserId,
            status: createProductDto.status || 'ACTIVE',
          },
        });

        const finalProductImages: string[] = [];
        for (const url of (createProductDto.images || [])) {
          const calc = this.calculateProductImagePath(newProduct.id, url);
          finalProductImages.push(calc.url);
          if (calc.fileToMove) pendingMoves.push(calc.fileToMove);
        }

        await tx.product.update({
          where: { id: newProduct.id },
          data: { images: finalProductImages },
        });

        if (createProductDto.variants && createProductDto.variants.length > 0) {
          // Truyền tên sản phẩm vào để sinh SKU
          await this.syncVariants(tx, newProduct.id, createProductDto.name, createProductDto.variants, basePrice, pendingMoves, []);
        }

        if (createProductDto.customizations && createProductDto.customizations.length > 0) {
          for (const custom of createProductDto.customizations) {
            await tx.productCustomization.create({
              data: {
                productId: newProduct.id,
                name: custom.name,
                type: custom.type,
                isRequired: custom.isRequired || false,
                maxLength: custom.maxLength,
                extraPrice: custom.extraPrice || 0,
                choices:
                  custom.choices && custom.choices.length > 0
                    ? {
                        create: custom.choices.map((choice: any) => ({
                          label: choice.label,
                          extraPrice: choice.extraPrice || 0,
                        })),
                      }
                    : undefined,
              },
            });
          }
        }

        return newProduct;
      });

      for (const move of pendingMoves) {
        await this.moveFileSafe(move.from, move.to);
        if (move.sourceDir !== resolve(this.publicRootDir, 'uploads', 'tmp')) {
          await this.removeEmptyDirSafe(move.sourceDir);
        }
      }

      return {
        success: true,
        message: this.i18n.t('products.success.product_created'),
        data: await this.findOne(product.id),
      };
    } catch (error: any) {
      if (error instanceof BadRequestException || error instanceof NotFoundException) {
        throw error;
      }
      
      if (error?.code === 'P2002') {
        throw new BadRequestException(this.i18n.t('products.error.duplicate_sku'));
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
    try {
      const existing = await this.findOne(id);

      const nextBasePrice = this.toNumber(dto.basePrice ?? existing.basePrice);
      this.assertMainImagesLimit(dto.images ?? existing.images);

      if (dto.variants) {
        this.assertVariantPrices(nextBasePrice, dto.variants);
      }

      const { variants, customizations, images, slug, ...productData } = dto as any;

      let finalSlug = existing.slug;
      
      if (slug !== undefined) {
        if (slug === existing.slug) {
          if (dto.name && dto.name !== existing.name) {
            finalSlug = await this.generateAutoSlug(dto.name, id);
          }
        } else if (slug.trim() === '') {
          const targetName = dto.name || existing.name;
          finalSlug = await this.generateAutoSlug(targetName, id);
        } else {
          finalSlug = this.slugify(slug);
          await this.checkManualSlug(finalSlug, id);
        }
      } else {
        if (dto.name && dto.name !== existing.name) {
          finalSlug = await this.generateAutoSlug(dto.name, id);
        }
      }

      const pendingMoves: PendingFileMove[] = [];
      const pendingCleanups: string[] = [];

      const incomingImages = images !== undefined ? images : existing.images;
      const finalProductImages: string[] = [];
      
      for (const url of incomingImages) {
        const calc = this.calculateProductImagePath(id, url);
        finalProductImages.push(calc.url);
        if (calc.fileToMove) pendingMoves.push(calc.fileToMove);
      }

      const removedProductImages = existing.images.filter((url: string) => !finalProductImages.includes(url));
      pendingCleanups.push(...removedProductImages);

      await this.prisma.$transaction(async (tx) => {
        await tx.product.update({
          where: { id },
          data: {
            ...productData,
            slug: finalSlug, 
            images: finalProductImages,
          },
        });

        if (variants) {
          // Lấy tên để phục vụ việc tự động tạo SKU nếu Admin tạo thêm biến thể mới lúc Update
          const targetName = productData.name || existing.name;
          await this.syncVariants(tx, id, targetName, variants, nextBasePrice, pendingMoves, pendingCleanups);
        }
      });

      if (customizations) {
        await this.customizationsService.syncCustomizations(id, customizations);
      }

      for (const move of pendingMoves) {
        await this.moveFileSafe(move.from, move.to);
        if (move.sourceDir !== resolve(this.publicRootDir, 'uploads', 'tmp')) {
          await this.removeEmptyDirSafe(move.sourceDir);
        }
      }
      
      await this.cleanupProductImageUrls(pendingCleanups);

      return {
        success: true,
        message: this.i18n.t('products.success.product_updated'),
        data: await this.findOne(id),
      };
    } catch (error: any) {
      if (error instanceof BadRequestException || error instanceof NotFoundException) {
        throw error;
      }
      if (error?.code === 'P2002') {
        throw new BadRequestException(this.i18n.t('products.error.duplicate_sku'));
      }

      this.logger.error('Lỗi Database khi cập nhật sản phẩm:', error instanceof Error ? error.stack : undefined);
      throw new InternalServerErrorException(this.i18n.t('products.error.product_update_failed'));
    }
  }

  async updateStatus(id: number, status: any) {
    const product = await this.prisma.product.findUnique({ where: { id } });
    if (!product) throw new NotFoundException(this.i18n.t('products.error.product_not_found'));

    try {
      const updatedProduct = await this.prisma.product.update({
        where: { id },
        data: { status },
      });

      return {
        success: true,
        message: this.i18n.t('products.success.status_updated'),
        data: updatedProduct,
      };
    } catch (error: any) {
      this.logger.error('Lỗi Database khi cập nhật trạng thái:', error instanceof Error ? error.stack : undefined);
      throw new InternalServerErrorException(this.i18n.t('products.error.status_update_failed'));
    }
  }

  async bulkUpdate(dto: { productIds: number[]; categoryId?: number; status?: string }) {
    const { productIds, categoryId, status } = dto;

    if (!productIds || productIds.length === 0) {
      throw new BadRequestException(this.i18n.t('products.error.no_products_selected'));
    }

    const updateData: any = {};
    
    if (categoryId !== undefined && categoryId !== null) {
      updateData.categoryId = Number(categoryId);
    }
    
    if (status !== undefined && status !== null) {
      updateData.status = status;
    }

    if (Object.keys(updateData).length === 0) {
      throw new BadRequestException(this.i18n.t('products.error.no_data_to_update'));
    }

    try {
      const result = await this.prisma.product.updateMany({
        where: { id: { in: productIds } },
        data: updateData,
      });

      this.logger.log(`Bulk update thành công: ${result.count} sản phẩm.`);

      return {
        success: true,
        message: this.i18n.t('products.success.bulk_updated', { 
          args: { count: result.count }
        }),
        updatedCount: result.count,
      };
    } catch (error) {
      this.logger.error('Lỗi Database khi Bulk Update:', error instanceof Error ? error.stack : undefined);
      throw new InternalServerErrorException(this.i18n.t('products.error.bulk_update_failed'));
    }
  }

  async remove(id: number) {
    const product = await this.prisma.product.findUnique({ where: { id } });
    if (!product) throw new NotFoundException(this.i18n.t('products.error.product_not_found'));

    try {
      const removedProduct = await this.prisma.product.update({
        where: { id },
        data: { status: 'ARCHIVED' },
      });

      return {
        success: true,
        message: this.i18n.t('products.success.product_removed'),
        data: removedProduct,
      };
    } catch (error: any) {
      this.logger.error('Lỗi Database khi xóa sản phẩm:', error instanceof Error ? error.stack : undefined);
      throw new InternalServerErrorException(this.i18n.t('products.error.product_remove_failed'));
    }
  }

  // ==============================================================
  // PUBLIC FEATURES (STOREFRONT)
  // ==============================================================

  async findAllPublic(query: { q?: string; categoryId?: string; skip?: number; take?: number }) {
    const { q, categoryId, skip, take } = query;
    
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

    if (categoryId && typeof categoryId === 'string' && categoryId.trim() !== '') {
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
        
        targetIds.forEach(targetId => {
          validCategoryIds.add(targetId);
          const subIds = getSubCategoryIds(targetId, allCategories);
          subIds.forEach(subId => validCategoryIds.add(subId));
        });
        
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