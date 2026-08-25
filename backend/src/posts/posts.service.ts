import { BadRequestException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { I18nService } from 'nestjs-i18n';
import * as fs from 'fs';
import { basename, dirname, join } from 'path';
import { PrismaService } from '../prisma/prisma.service';
import { CreatePostDto } from './dto/create-post.dto';
import { UpdatePostDto } from './dto/update-post.dto';

// Định nghĩa kiểu dữ liệu cho các file đang xếp hàng chờ thuyên chuyển
type PendingFileMove = {
    from: string;
    to: string;
};

@Injectable()
export class PostsService {
    private readonly logger = new Logger(PostsService.name);
    private readonly postsRootDir = join(process.cwd(), 'public', 'uploads', 'posts');

    constructor(
        private readonly prisma: PrismaService,
        private readonly i18n: I18nService,
    ) {}

    // ==============================================================
    // PRIVATE UTILITIES (FILE, SLUG & HTML MANAGEMENT)
    // ==============================================================

    // Tự động sinh slug từ title, xử lý trùng lặp bằng -1, -2
    private async generateAutoSlug(text: string, currentId?: number): Promise<string> {
        const baseSlug = text
            .toString()
            .toLowerCase()
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '')
            .replace(/đ/g, 'd')
            .replace(/Đ/g, 'D')
            .replace(/\s+/g, '-')
            .replace(/[^\w\-]+/g, '')
            .replace(/\-\-+/g, '-')
            .replace(/^-+/, '')
            .replace(/-+$/, '');

        let slug = baseSlug;
        let counter = 1;

        while (true) {
            const existing = await this.prisma.post.findFirst({ where: { slug } });
            if (!existing || existing.id === currentId) {
                return slug;
            }
            slug = `${baseSlug}-${counter}`;
            counter++;
        }
    }

    // Di chuyển file an toàn và xử lý lỗi EXDEV / File đã dời
    private moveFileSafe(from: string, to: string) {
        if (!fs.existsSync(dirname(to))) {
            fs.mkdirSync(dirname(to), { recursive: true });
        }
        
        if (from === to) return;

        try {
            fs.accessSync(from); // Kiểm tra file nguồn còn không
        } catch (error) {
            try {
                fs.accessSync(to); // Nguồn mất, kiểm tra xem đã tới đích chưa
                return; // Đã tới đích an toàn
            } catch (err) {
                throw new Error(`File không tồn tại ở cả nguồn và đích: ${from}`);
            }
        }

        try {
            fs.renameSync(from, to);
        } catch (error: any) {
            if (error?.code === 'EXDEV') {
                fs.copyFileSync(from, to);
                fs.unlinkSync(from);
                return;
            }
            throw error;
        }
    }

    // Thay thế inline img src
    private replaceInlineImageSources(html: string, postId: number, filenameMap: Map<string, string>) {
        return html.replace(/<img\b[^>]*>/gi, (imgTag) => {
            const filenameMatch = imgTag.match(/data-filename=["']([^"']+)["']/i);
            if (!filenameMatch) return imgTag;

            const originalFilename = filenameMatch[1];
            const storedFilename = filenameMap.get(originalFilename) ?? filenameMap.get(basename(originalFilename));
            if (!storedFilename) return imgTag;

            const imageUrl = `/uploads/posts/${postId}/${storedFilename}`;
            
            if (/src=["'][^"']*["']/i.test(imgTag)) {
                return imgTag.replace(/src=["'][^"']*["']/i, `src="${imageUrl}"`);
            }
            return imgTag.replace('<img', `<img src="${imageUrl}"`);
        });
    }

    // ==============================================================
    // ADMIN FEATURES (CRUD & MANAGEMENT)
    // ==============================================================

    async findAll(query: { q?: string; isPublished?: boolean; skip?: number; take?: number }) {
        const where: any = {};

        if (query.q) {
            where.OR = [
                { title: { contains: query.q, mode: 'insensitive' } },
                { slug: { contains: query.q, mode: 'insensitive' } },
            ];
        }

        if (typeof query.isPublished === 'boolean') {
            where.isPublished = query.isPublished;
        }

        const [items, total] = await Promise.all([
            this.prisma.post.findMany({
                where,
                skip: query.skip ? Number(query.skip) : undefined,
                take: query.take ? Number(query.take) : undefined,
                orderBy: { createdAt: 'desc' },
                include: {
                    author: { select: { id: true, name: true, email: true } },
                },
            }),
            this.prisma.post.count({ where }),
        ]);

        return { items, total };
    }

    async findOne(id: number) {
        const post = await this.prisma.post.findUnique({
            where: { id },
            include: {
                author: { select: { id: true, name: true, email: true } },
            },
        });

        if (!post) {
            throw new NotFoundException(this.i18n.t('posts.error.post_not_found_with_id', { args: { id } }));
        }

        return post;
    }

    async create(
        dto: CreatePostDto,
        files: { thumbnail?: Express.Multer.File[]; contentImages?: Express.Multer.File[] },
        authorId: number,
    ) {
        const pendingMoves: PendingFileMove[] = [];

        try {
            // SỬ DỤNG TRANSACTION LOCK (Cần thiết vì thao tác ghi 2 lần: create -> update HTML)
            const post = await this.prisma.$transaction(async (tx) => {
                const slug = await this.generateAutoSlug(dto.title);

                // Lần 1: Tạo record để lấy ID
                const createdPost = await tx.post.create({
                    data: {
                        title: dto.title,
                        slug,
                        summary: dto.summary,
                        content: dto.content,
                        isPublished: dto.isPublished,
                        authorId,
                    },
                });

                const createdPostDir = join(this.postsRootDir, String(createdPost.id));
                let thumbnailUrl: string | null = null;
                const filenameMap = new Map<string, string>();

                // Chuẩn bị tính toán đường dẫn 
                const thumbnailFile = files.thumbnail?.[0];
                const contentImages = files.contentImages ?? [];

                if (thumbnailFile) {
                    const thumbnailTargetPath = join(createdPostDir, thumbnailFile.filename);
                    pendingMoves.push({ from: thumbnailFile.path, to: thumbnailTargetPath });
                    thumbnailUrl = `/uploads/posts/${createdPost.id}/${thumbnailFile.filename}`;
                }

                for (const file of contentImages) {
                    const targetFilePath = join(createdPostDir, file.filename);
                    pendingMoves.push({ from: file.path, to: targetFilePath });
                    filenameMap.set(file.originalname, file.filename);
                    filenameMap.set(basename(file.originalname), file.filename);
                }

                const mappedContent = this.replaceInlineImageSources(dto.content, createdPost.id, filenameMap);

                return tx.post.update({
                    where: { id: createdPost.id },
                    data: {
                        content: mappedContent,
                        thumbnail: thumbnailUrl,
                    },
                });
            });

            // GIAO DỊCH THÀNH CÔNG: TIẾN HÀNH DỜI FILE VẬT LÝ (Deferred Execution)
            for (const move of pendingMoves) {
                this.moveFileSafe(move.from, move.to);
            }

            const totalUploadedFiles = (files.thumbnail?.length ?? 0) + (files.contentImages?.length ?? 0);
            this.logger.log(`Created post ${post.id} with ${totalUploadedFiles} uploaded file(s)`);

            return {
                success: true,
                message: this.i18n.t('posts.success.post_created'),
                data: post,
            };
        } catch (error) {
            // DB sập -> Catch nhảy vào đây. File không bị dời, vẫn ở /tmp. 
            // Không để lại rác trên thư mục đích, không tạo bài viết ảo.
            this.logger.error('Failed to create post', error instanceof Error ? error.stack : undefined);
            throw new BadRequestException(this.i18n.t('posts.error.post_create_failed'));
        }
    }

    async update(
        id: number,
        dto: UpdatePostDto,
        files: { thumbnail?: Express.Multer.File[]; contentImages?: Express.Multer.File[] },
    ) {
        try {
            const existingPost = await this.findOne(id);
            const postDir = join(this.postsRootDir, String(id));
            const pendingMoves: PendingFileMove[] = [];
            const pendingDeletes: string[] = [];

            let thumbnailUrl = existingPost.thumbnail;
            const filenameMap = new Map<string, string>();
            const thumbnailFile = files?.thumbnail?.[0];
            const contentImages = files?.contentImages ?? [];

            // 1. Tính toán Thumbnail
            if (thumbnailFile) {
                const thumbnailTargetPath = join(postDir, thumbnailFile.filename);
                pendingMoves.push({ from: thumbnailFile.path, to: thumbnailTargetPath });
                thumbnailUrl = `/uploads/posts/${id}/${thumbnailFile.filename}`;

                if (existingPost.thumbnail) {
                    const oldThumbnailName = basename(existingPost.thumbnail);
                    const oldThumbnailPath = join(postDir, oldThumbnailName);
                    pendingDeletes.push(oldThumbnailPath);
                }
            }

            // 2. Tính toán Content Images
            for (const file of contentImages) {
                const targetFilePath = join(postDir, file.filename);
                pendingMoves.push({ from: file.path, to: targetFilePath });
                filenameMap.set(file.originalname, file.filename);
                filenameMap.set(basename(file.originalname), file.filename);
            }

            // 3. Map HTML
            let mappedContent = existingPost.content;
            if (dto.content !== undefined) {
                mappedContent = this.replaceInlineImageSources(dto.content, id, filenameMap);
            }

            const slug = dto.title && dto.title !== existingPost.title 
                ? await this.generateAutoSlug(dto.title, id) 
                : existingPost.slug;

            // 4. Garbage Collection Logic (Đưa vào mảng chờ xóa)
            if (fs.existsSync(postDir)) {
                const allFilesInDir = fs.readdirSync(postDir);
                for (const file of allFilesInDir) {
                    if (thumbnailUrl && thumbnailUrl.includes(file)) continue;

                    if (!mappedContent.includes(file)) {
                        const filePath = join(postDir, file);
                        pendingDeletes.push(filePath);
                    }
                }
            }

            // 5. Transaction cho Update (Đề phòng database sập bất ngờ)
            const updatedPost = await this.prisma.$transaction(async (tx) => {
                return tx.post.update({
                    where: { id },
                    data: {
                        title: dto.title,
                        slug,
                        summary: dto.summary,
                        content: mappedContent,
                        isPublished: dto.isPublished,
                        thumbnail: thumbnailUrl,
                    },
                });
            });

            // 6. DB THÀNH CÔNG -> Chạy File System (Move & Delete)
            for (const move of pendingMoves) {
                this.moveFileSafe(move.from, move.to);
            }

            for (const filePath of pendingDeletes) {
                if (fs.existsSync(filePath)) {
                    fs.unlinkSync(filePath);
                }
            }

            return {
                success: true,
                message: this.i18n.t('posts.success.post_updated'),
                data: updatedPost,
            };
        } catch (error) {
            this.logger.error(`Failed to update post ${id}`, error instanceof Error ? error.stack : undefined);
            if (error instanceof NotFoundException) throw error;
            throw new BadRequestException(this.i18n.t('posts.error.post_update_failed'));
        }
    }

    // ==============================================================
    // PUBLIC FEATURES (STOREFRONT)
    // ==============================================================

    async findAllPublic(query: { q?: string; skip?: number; take?: number }) {
        const where: any = { isPublished: true };

        if (query.q) {
            where.OR = [
                { title: { contains: query.q, mode: 'insensitive' } },
                { slug: { contains: query.q, mode: 'insensitive' } },
            ];
        }

        const [items, total] = await Promise.all([
            this.prisma.post.findMany({
                where,
                skip: query.skip ?? 0,
                take: query.take ?? 10,
                orderBy: { createdAt: 'desc' },
                select: {
                    id: true, title: true, slug: true, summary: true, 
                    thumbnail: true, createdAt: true, updatedAt: true,
                    author: { select: { id: true, name: true } },
                },
            }),
            this.prisma.post.count({ where }),
        ]);

        return { items, total };
    }

    async findOneBySlug(slug: string) {
        const post = await this.prisma.post.findFirst({
            where: { slug, isPublished: true },
            include: { author: { select: { id: true, name: true } } },
        });

        if (!post) throw new NotFoundException(this.i18n.t('posts.error.post_not_found'));

        return post;
    }
}