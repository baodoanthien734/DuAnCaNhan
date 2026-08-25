import { Injectable, NotFoundException, Logger, BadRequestException, OnModuleInit } from '@nestjs/common';
import { I18nService } from 'nestjs-i18n';
import { PrismaService } from '../prisma/prisma.service';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';
import { resolve, dirname } from 'path';
import * as fs from 'fs/promises';

@Injectable()
export class CategoriesService implements OnModuleInit {
  private readonly logger = new Logger(CategoriesService.name);
  private readonly publicRootDir = resolve(process.cwd(), 'public');

  constructor(
    private prisma: PrismaService,
    private readonly i18n: I18nService,
  ) {}

  // Lifecycle hook: Tự động chạy mỗi khi server khởi động
  async onModuleInit() {
    const systemCat = await this.prisma.category.findFirst({
      where: { isSystem: true },
    });

    if (!systemCat) {
      await this.prisma.category.create({
        data: {
          name: 'Chưa phân loại',
          slug: 'chua-phan-loai',
          isActive: true,
          isSystem: true,
          position: 1,
        },
      });
      this.logger.log('Đã tự động khởi tạo danh mục hệ thống "Chưa phân loại"');
    }
  }

  private async ensureDir(path: string) {
    await fs.mkdir(path, { recursive: true });
  }

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

  private async removeFileSafe(filePath: string) {
    try {
      await fs.unlink(filePath);
    } catch (error: any) {
      if (error?.code !== 'ENOENT') {
        this.logger.warn(`Không thể xóa file ${filePath}: ${error?.message}`);
      }
    }
  }

  private async saveFileFromMemory(file: Express.Multer.File, categoryId: number): Promise<string> {
    const timestamp = Date.now();
    const sanitizedName = file.originalname.replace(/[^a-zA-Z0-9.\-_]/g, '-');
    const fileName = `${timestamp}-${sanitizedName}`;
    const relativePath = `uploads/categories/${categoryId}/${fileName}`;
    const absolutePath = resolve(this.publicRootDir, relativePath);

    await this.ensureDir(dirname(absolutePath));
    await fs.writeFile(absolutePath, file.buffer);

    return `/${relativePath}`;
  }

  private async generateAutoSlug(name: string, currentId?: number): Promise<string> {
    const baseSlug = this.slugify(name);
    let slug = baseSlug;
    let counter = 1;

    while (true) {
      const existing = await this.prisma.category.findFirst({ where: { slug } });
      if (!existing || existing.id === currentId) {
        return slug;
      }
      slug = `${baseSlug}-${counter}`;
      counter++;
    }
  }

  private async checkManualSlug(slug: string, currentId?: number): Promise<void> {
    const existing = await this.prisma.category.findFirst({ where: { slug } });
    if (existing && existing.id !== currentId) {
      throw new BadRequestException(this.i18n.t('categories.error.duplicate_slug'));
    }
  }

  async findAll(query: { q?: string; parentId?: number; skip?: number; take?: number }) {
    const where: any = { isActive: true };
    if (query.q) {
      where.OR = [{ name: { contains: query.q, mode: 'insensitive' } }, { slug: { contains: query.q, mode: 'insensitive' } }];
    }
    if (typeof query.parentId !== 'undefined') {
      where.parentId = Number(query.parentId);
    }

    const [items, total] = await this.prisma.$transaction([
      this.prisma.category.findMany({ where, orderBy: { position: 'asc' }, skip: query.skip, take: query.take }),
      this.prisma.category.count({ where }),
    ]);

    return { items, total };
  }

  async findOne(id: number) {
    const cat = await this.prisma.category.findUnique({ where: { id }, include: { children: true } });
    if (!cat) throw new NotFoundException(this.i18n.t('categories.error.category_not_found'));
    return cat;
  }

  async create(dto: CreateCategoryDto, file?: Express.Multer.File) {
    const data: any = { ...dto };

    // --- ĐOẠN CODE BỔ SUNG: CHẶN TẠO CON NẾU CHA ĐANG CÓ SẢN PHẨM ---
    if (data.parentId) {
      const parentIdNum = Number(data.parentId);
      const productCountInParent = await this.prisma.product.count({
        where: { categoryId: parentIdNum },
      });

      if (productCountInParent > 0) {
        throw new BadRequestException(
          this.i18n.t('categories.error.parent_has_products', {
            defaultValue: 'Không thể chọn danh mục này làm cha vì nó đang trực tiếp chứa sản phẩm.',
          })
        );
      }
    }
    // -----------------------------------------------------------------
    
    if (!data.slug) {
      data.slug = await this.generateAutoSlug(data.name);
    } else {
      data.slug = this.slugify(data.slug);
      await this.checkManualSlug(data.slug);
    }

    if (data.isActive !== undefined) data.isActive = data.isActive === 'true' || data.isActive === true;
    if (data.parentId !== undefined) data.parentId = data.parentId ? Number(data.parentId) : null;

    if (data.position === undefined || data.position === null || data.position === '') {
      const lastCat = await this.prisma.category.findFirst({
        where: { parentId: data.parentId || null },
        orderBy: { position: 'desc' },
      });
      data.position = lastCat?.position ? lastCat.position + 1 : 1;
    } else {
      data.position = Number(data.position);
    }

    delete data.removeImage;
    delete data.image;

    let category = await this.prisma.category.create({ data });

    if (file) {
      const imageUrl = await this.saveFileFromMemory(file, category.id);
      category = await this.prisma.category.update({
        where: { id: category.id },
        data: { image: imageUrl },
      });
    }

    return category;
  }

  async update(id: number, dto: UpdateCategoryDto, file?: Express.Multer.File) {
    const existing = await this.findOne(id);
    const data: any = { ...dto };

    // --- ĐOẠN CODE BỔ SUNG: CHẶN KHI ĐỔI SANG CHA MỚI ĐANG CÓ SẢN PHẨM ---
    if (data.parentId && Number(data.parentId) !== existing.parentId) {
      const parentIdNum = Number(data.parentId);
      const productCountInParent = await this.prisma.product.count({
        where: { categoryId: parentIdNum },
      });

      if (productCountInParent > 0) {
        throw new BadRequestException(
          this.i18n.t('categories.error.parent_has_products', {
            defaultValue: 'Không thể di chuyển vào danh mục này vì nó đang trực tiếp chứa sản phẩm.',
          })
        );
      }
    }
    // -----------------------------------------------------------------------

    // --- BẢO VỆ DANH MỤC HỆ THỐNG ---
    if (existing.isSystem) {
      if (data.name && data.name !== existing.name) {
        throw new BadRequestException(this.i18n.t('categories.error.cannot_modify_system_category_name'));
      }
      if (data.slug && data.slug !== existing.slug) {
        throw new BadRequestException(this.i18n.t('categories.error.cannot_modify_system_category_slug'));
      }
      data.name = existing.name;
      data.slug = existing.slug;
      delete data.parentId; 
      delete data.position;
    } else {
      // Logic Slug cho danh mục thường
      if (data.slug) {
        if (data.slug === existing.slug) {
          if (data.name && data.name !== existing.name) {
            data.slug = await this.generateAutoSlug(data.name, id);
          } else {
            delete data.slug;
          }
        } else {
          data.slug = this.slugify(data.slug);
          await this.checkManualSlug(data.slug, id);
        }
      } else {
        const targetName = data.name || existing.name;
        data.slug = await this.generateAutoSlug(targetName, id);
      }

      if (data.parentId !== undefined) {
        data.parentId = data.parentId ? Number(data.parentId) : null;
      }
      const isChangingParent = data.parentId !== undefined && data.parentId !== existing.parentId;

      if (isChangingParent) {
        const lastCat = await this.prisma.category.findFirst({
          where: { parentId: data.parentId || null },
          orderBy: { position: 'desc' },
        });
        data.position = lastCat?.position ? lastCat.position + 1 : 1;
      } else if (data.position !== undefined && data.position !== '') {
        data.position = Number(data.position);
      } else {
        delete data.position;
      }
    }

    if (data.isActive !== undefined) data.isActive = data.isActive === 'true' || data.isActive === true;

    if (data.removeImage === 'true') {
      if (existing.image) {
        const absolutePath = resolve(this.publicRootDir, existing.image.replace(/^\/+/, ''));
        await this.removeFileSafe(absolutePath);
      }
      data.image = null;
      delete data.removeImage;
    } else if (file) {
      if (existing.image) {
        const absolutePath = resolve(this.publicRootDir, existing.image.replace(/^\/+/, ''));
        await this.removeFileSafe(absolutePath);
      }
      data.image = await this.saveFileFromMemory(file, id);
      delete data.removeImage;
    } else {
      delete data.removeImage;
      delete data.image; 
    }

    return this.prisma.category.update({ where: { id }, data });
  }

  async remove(id: number) {
    const cat = await this.findOne(id);

    if (cat.isSystem) { 
      throw new BadRequestException(this.i18n.t('categories.error.cannot_delete_system_category'));
    }

    //Lấy TOÀN BỘ danh mục (kể cả đã bị ẩn/xóa mềm) để đảm bảo không lọt đứa con nào
    const allCategories = await this.prisma.category.findMany();

    const getSubCategoryIds = (parentId: number): number[] => {
      const children = allCategories.filter((c) => c.parentId === parentId);
      const subIds = children.map((c) => c.id);
      children.forEach((child) => {
        subIds.push(...getSubCategoryIds(child.id));
      });
      return subIds;
    };

    const allIdsToCheck = [id, ...getSubCategoryIds(id)];

    //Đếm MỌI SẢN PHẨM (không quan tâm status)
    const productCount = await this.prisma.product.count({
      where: {
        categoryId: { in: allIdsToCheck },
      },
    });

    // ==========================================
    // CAMERA GIÁM SÁT: HÃY NHÌN VÀO TERMINAL CỦA NESTJS
    // ==========================================
    console.log('--- DEBUG XÓA DANH MỤC ---');
    console.log(`1. ID đang yêu cầu xóa: ${id}`);
    console.log(`2. Mảng ID con cháu tìm được:`, allIdsToCheck);
    console.log(`3. Tổng số sản phẩm đếm được: ${productCount}`);
    console.log('---------------------------');

    if (productCount > 0) {
      throw new BadRequestException(
        this.i18n.t('categories.error.cannot_delete_has_products', {
          args: { count: productCount },
        })
      );
    }

    // Nếu lọt qua được (productCount === 0), tiến hành xóa mềm toàn bộ cây
    return this.prisma.category.updateMany({
      where: { id: { in: allIdsToCheck } },
      data: { isActive: false },
    });
  }

  async reorder(updates: { id: number; position: number }[]) {
    return this.prisma.$transaction(
      updates.map((u) => this.prisma.category.update({ where: { id: u.id }, data: { position: u.position } })),
    );
  }

  async findAllPublic() {
    return this.prisma.category.findMany({
      where: { 
        isActive: true,
        isSystem: false // <--- THÊM DÒNG NÀY ĐỂ GIẤU KHỎI KHÁCH HÀNG
      },
      orderBy: { position: 'asc' },
      include: {
        children: {
          where: { 
            isActive: true,
            isSystem: false // <--- THÊM VÀO CẢ ĐÂY NỮA (Phòng hờ)
          },
          orderBy: { position: 'asc' },
        },
      },
    });
  }

  async findOneBySlugPublic(slug: string) {
    // 1. Chặn ngay từ cửa: Không tìm danh mục hệ thống!
    const category = await this.prisma.category.findFirst({
      where: { 
        slug, 
        isActive: true,
        isSystem: false // <--- Bổ sung cờ bảo vệ ở đây
      },
    });

    if (!category) throw new NotFoundException(this.i18n.t('categories.error.category_not_found'));

    // 2. Khi lấy danh sách để tính toán cây/breadcrumbs, cũng phải loại trừ danh mục hệ thống
    const allCategories = await this.prisma.category.findMany({
      where: { 
        isActive: true,
        isSystem: false // <--- Bổ sung cờ bảo vệ ở đây
      },
      orderBy: { position: 'asc' },
    });

    const getSubCategoryIds = (parentId: number): number[] => {
      const children = allCategories.filter((c) => c.parentId === parentId);
      const subIds = children.map((c) => c.id);
      children.forEach((child) => {
        subIds.push(...getSubCategoryIds(child.id));
      });
      return subIds;
    };

    const allSubCategoryIds = [category.id, ...getSubCategoryIds(category.id)];

    const breadcrumbs: { id: number; name: string; slug: string }[] = [];
    let currentCat: any = category;
    while (currentCat) {
      breadcrumbs.unshift({ id: currentCat.id, name: currentCat.name, slug: currentCat.slug });
      currentCat = allCategories.find((c) => c.id === currentCat.parentId);
    }

    const rawChildren = allCategories.filter((c) => c.parentId === category.id);
    
    const children = await Promise.all(
      rawChildren.map(async (child) => {
        const childAndItsSubIds = [child.id, ...getSubCategoryIds(child.id)];
        
        const productCount = await this.prisma.product.count({
          where: {
            categoryId: { in: childAndItsSubIds },
            status: 'ACTIVE',
          },
        });

        return {
          id: child.id,
          name: child.name,
          slug: child.slug,
          image: child.image,
          productCount,
        };
      })
    );

    return {
      category,
      breadcrumbs,
      children,
      allSubCategoryIds,
    };
  }
}