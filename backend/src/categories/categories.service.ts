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

  private slugify(text: string) {
    return text
      .toString()
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

  // Thay đổi để nhận thêm tham số file
  async create(dto: CreateCategoryDto, file?: Express.Multer.File) {
    const data: any = { ...dto };
    if (!data.slug) data.slug = this.slugify(data.name);

    // Chuyển boolean string thành boolean
    if (data.isActive !== undefined) data.isActive = data.isActive === 'true' || data.isActive === true;
    if (data.parentId) data.parentId = Number(data.parentId);
    if (data.position) data.position = Number(data.position);

    delete data.removeImage; // Xóa cờ báo gỡ ảnh (DB không có cột này)
    delete data.image;       // Xóa trường image (Vì file ảnh sẽ được lưu và update lại URL sau khi đã có ID)

    // Tạo Category trước
    let category = await this.prisma.category.create({ data });

    // Lưu ảnh và cập nhật lại DB
    if (file) {
      const imageUrl = await this.saveFileFromMemory(file, category.id);
      category = await this.prisma.category.update({
        where: { id: category.id },
        data: { image: imageUrl },
      });
    }

    return category;
  }

  // Thay đổi để nhận thêm tham số file
  async update(id: number, dto: UpdateCategoryDto, file?: Express.Multer.File) {
    const existing = await this.findOne(id);
    const data: any = { ...dto };

    if (data.name && data.name !== existing.name && !data.slug) {
      data.slug = this.slugify(data.name);
    }

    if (data.isActive !== undefined) data.isActive = data.isActive === 'true' || data.isActive === true;
    if (data.parentId) data.parentId = Number(data.parentId);
    if (data.position) data.position = Number(data.position);

    // Bắt cờ removeImage (Nếu người dùng xóa ảnh trên UI)
    if (data.removeImage === 'true') {
      if (existing.image) {
        const absolutePath = resolve(this.publicRootDir, existing.image.replace(/^\/+/, ''));
        await this.removeFileSafe(absolutePath);
      }
      data.image = null;
      delete data.removeImage;
    } 
    // Nếu có file mới đẩy lên
    else if (file) {
      if (existing.image) {
        const absolutePath = resolve(this.publicRootDir, existing.image.replace(/^\/+/, ''));
        await this.removeFileSafe(absolutePath);
      }
      data.image = await this.saveFileFromMemory(file, id);
      delete data.removeImage;
    } else {
      // Giữ nguyên ảnh cũ, không làm gì
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
    const cat = await this.prisma.category.findFirst({
      where: { slug, isActive: true },
    });

    if (!cat) throw new NotFoundException(this.i18n.t('categories.error.category_not_found'));
    return cat;
  }
}