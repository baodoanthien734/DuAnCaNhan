import { Injectable, NotFoundException, Logger, BadRequestException } from '@nestjs/common';
import { I18nService } from 'nestjs-i18n';
import { PrismaService } from '../prisma/prisma.service';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';
import { resolve, dirname } from 'path';
import * as fs from 'fs/promises';

@Injectable()
export class CategoriesService {
  private readonly logger = new Logger(CategoriesService.name);
  private readonly publicRootDir = resolve(process.cwd(), 'public');

  constructor(
    private prisma: PrismaService,
    private readonly i18n: I18nService,
  ) {}

  private async ensureDir(path: string) {
    await fs.mkdir(path, { recursive: true });
  }

  // Hàm slugify để tạo slug từ tên danh mục
  private slugify(text: string) {
    return text
      .toString()
      .normalize('NFD')                   // Tách dấu ra khỏi chữ (VD: ủ -> u + ̉)
      .replace(/[\u0300-\u036f]/g, '')    // Xóa toàn bộ các dấu tiếng Việt
      .replace(/đ/g, 'd').replace(/Đ/g, 'D') // Xử lý chữ Đ
      .toLowerCase()
      .trim()
      .replace(/\s+/g, '-')               // Đổi khoảng trắng thành dấu gạch ngang
      .replace(/[^a-z0-9\-]/g, '')        // Xóa các ký tự đặc biệt
      .replace(/\-+/g, '-');              // Xóa các dấu gạch ngang thừa
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

  // Hàm lưu file trực tiếp từ RAM xuống ổ cứng
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

  async findAll(query: { q?: string; parentId?: number; skip?: number; take?: number }) {
    const where: any = { isActive: true };
    if (query.q) {
      where.OR = [{ name: { contains: query.q, mode: 'insensitive' } }, { slug: { contains: query.q, mode: 'insensitive' } }];
    }
    if (typeof query.parentId !== 'undefined') {
      where.parentId = Number(query.parentId); // Fix: Ép kiểu
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

  // Helper 1: Dành cho Hệ thống TỰ ĐỘNG SINH (Có auto thêm -1, -2)
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

  // Helper 2: Dành cho Admin TỰ NHẬP TAY (Bắn lỗi 400 nếu trùng)
  private async checkManualSlug(slug: string, currentId?: number): Promise<void> {
    const existing = await this.prisma.category.findFirst({ where: { slug } });
    if (existing && existing.id !== currentId) {
      throw new BadRequestException(this.i18n.t('categories.error.duplicate_slug'));
    }
  }

  async create(dto: CreateCategoryDto, file?: Express.Multer.File) {
    const data: any = { ...dto };
    
    // PHÂN BIỆT RÕ RÀNG: ADMIN NHẬP HAY KHÔNG NHẬP
    if (!data.slug) {
      // 1. Admin bỏ trống -> Hệ thống tự sinh (chấp nhận -1, -2)
      data.slug = await this.generateAutoSlug(data.name);
    } else {
      // 2. Admin gõ tay -> Clean chuỗi và Kiểm tra trùng lặp
      data.slug = this.slugify(data.slug);
      await this.checkManualSlug(data.slug); // Bắn lỗi ngay lập tức nếu trùng
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

    // XỬ LÝ LOGIC SLUG THÔNG MINH KHI EDIT
    if (data.slug) {
      if (data.slug === existing.slug) {
        // Trường hợp A: Frontend gửi lên Slug y hệt như cũ (Admin không đụng vào ô Slug)
        if (data.name && data.name !== existing.name) {
          // A1: Admin không đổi Slug, NHƯNG đổi Tên (Quà Tặng -> Quà Tặng Du Lịch)
          // -> Hệ thống tự động bám theo tên mới để sinh Slug mới
          data.slug = await this.generateAutoSlug(data.name, id);
        } else {
          // A2: Tên không đổi, Slug không đổi -> Bỏ qua, không update cột Slug nữa
          delete data.slug;
        }
      } else {
        // Trường hợp B: Admin chủ ý xóa slug cũ, gõ tay một slug hoàn toàn mới
        data.slug = this.slugify(data.slug);
        await this.checkManualSlug(data.slug, id); // Bắn lỗi nếu admin gõ trùng
      }
    } else {
      // Trường hợp C: Admin cố tình xóa sạch ô Slug trên giao diện
      // -> Hệ thống lấy Tên hiện tại ra tự sinh lại Slug mới
      const targetName = data.name || existing.name;
      data.slug = await this.generateAutoSlug(targetName, id);
    }

    if (data.isActive !== undefined) data.isActive = data.isActive === 'true' || data.isActive === true;
    
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
    await this.findOne(id);
    return this.prisma.category.update({ where: { id }, data: { isActive: false } });
  }

  async reorder(updates: { id: number; position: number }[]) {
    return this.prisma.$transaction(
      updates.map((u) => this.prisma.category.update({ where: { id: u.id }, data: { position: u.position } })),
    );
  }

  async findAllPublic() {
    return this.prisma.category.findMany({
      where: { isActive: true },
      orderBy: { position: 'asc' },
      include: {
        children: {
          where: { isActive: true },
          orderBy: { position: 'asc' },
        },
      },
    });
  }

  async findOneBySlugPublic(slug: string) {
    // 1. Tìm danh mục hiện tại (phải đang ACTIVE)
    const category = await this.prisma.category.findFirst({
      where: { slug, isActive: true },
    });

    if (!category) throw new NotFoundException(this.i18n.t('categories.error.category_not_found'));

    // 2. Lấy TOÀN BỘ danh mục đang ACTIVE để xử lý cây (Vì số lượng danh mục thường ít, query 1 lần sẽ nhanh hơn đệ quy SQL)
    const allCategories = await this.prisma.category.findMany({
      where: { isActive: true },
      orderBy: { position: 'asc' },
    });

    // 3. Xử lý thuật toán: Tìm tất cả ID con/cháu chắt
    const getSubCategoryIds = (parentId: number): number[] => {
      const children = allCategories.filter((c) => c.parentId === parentId);
      const subIds = children.map((c) => c.id);
      children.forEach((child) => {
        subIds.push(...getSubCategoryIds(child.id));
      });
      return subIds;
    };

    // Mảng ID dùng để Frontend gửi đi query Products (bao gồm cả chính nó và các con)
    const allSubCategoryIds = [category.id, ...getSubCategoryIds(category.id)];

    // 4. Xử lý thuật toán: Tạo đường dẫn Breadcrumbs (Chạy lùi từ con lên cha root)
    // Thay vì: const breadcrumbs = [];
const breadcrumbs: { id: number; name: string; slug: string }[] = [];
    let currentCat: any = category;
    while (currentCat) {
      breadcrumbs.unshift({ id: currentCat.id, name: currentCat.name, slug: currentCat.slug });
      currentCat = allCategories.find((c) => c.id === currentCat.parentId);
    }

    // 5. Xử lý thuật toán: Tìm danh mục con TRỰC TIẾP và đếm số lượng sản phẩm của chúng
    const rawChildren = allCategories.filter((c) => c.parentId === category.id);
    
    const children = await Promise.all(
      rawChildren.map(async (child) => {
        // Tìm toàn bộ ID con cháu của cái child này để đếm cho chính xác
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

    // 6. Đóng gói trả về Frontend
    return {
      category,
      breadcrumbs,
      children,
      allSubCategoryIds,
    };
  }
}