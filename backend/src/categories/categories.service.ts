import { Injectable, NotFoundException } from '@nestjs/common';
import { I18nService } from 'nestjs-i18n';
import { PrismaService } from '../prisma/prisma.service';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';

@Injectable()
export class CategoriesService {
  constructor(
    private prisma: PrismaService,
    private readonly i18n: I18nService,
  ) {}

  async findAll(query: { q?: string; parentId?: number; skip?: number; take?: number }) {
    const where: any = { isActive: true };
    if (query.q) {
      where.OR = [{ name: { contains: query.q, mode: 'insensitive' } }, { slug: { contains: query.q, mode: 'insensitive' } }];
    }
    if (typeof query.parentId !== 'undefined') {
      where.parentId = query.parentId;
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

  async create(dto: CreateCategoryDto) {
    const data: any = { ...dto };
    if (!data.slug) data.slug = this.slugify(data.name);
    return this.prisma.category.create({ data });
  }

  async update(id: number, dto: UpdateCategoryDto) {
    await this.findOne(id);
    const data: any = { ...dto };
    if (data.name && !data.slug) data.slug = this.slugify(data.name);
    return this.prisma.category.update({ where: { id }, data });
  }

  async remove(id: number) {
    // soft delete
    await this.findOne(id);
    return this.prisma.category.update({ where: { id }, data: { isActive: false } });
  }

  async reorder(updates: { id: number; position: number }[]) {
    return this.prisma.$transaction(
      updates.map((u) => this.prisma.category.update({ where: { id: u.id }, data: { position: u.position } })),
    );
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
}
