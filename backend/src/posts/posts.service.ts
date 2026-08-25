import { BadRequestException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { I18nService } from 'nestjs-i18n';
import * as fs from 'fs';
import { basename, join } from 'path';
import { PrismaService } from '../prisma/prisma.service';
import { CreatePostDto } from './dto/create-post.dto';
import { UpdatePostDto } from './dto/update-post.dto';

@Injectable()
export class PostsService {
	private readonly logger = new Logger(PostsService.name);
	private readonly postsRootDir = join(process.cwd(), 'public', 'uploads', 'posts');

	constructor(
		private readonly prisma: PrismaService,
		private readonly i18n: I18nService,
	) {}

	private generateSlug(text: string): string {
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

		return `${baseSlug}-${Date.now()}`;
	}

	private replaceInlineImageSources(
		html: string,
		postId: number,
		filenameMap: Map<string, string>,
	) {
		// Replace the src of <img> tags in the HTML content with the corresponding stored filenames
		return html.replace(/<img\b[^>]*>/gi, (imgTag) => {
			// Extract the original filename from the data-filename attribute
			const filenameMatch = imgTag.match(/data-filename=["']([^"']+)["']/i);
			if (!filenameMatch) {
				return imgTag;
			}

			const originalFilename = filenameMatch[1];
			// Look up the stored filename in the map
			const storedFilename = filenameMap.get(originalFilename) ?? filenameMap.get(basename(originalFilename));
			if (!storedFilename) {
				return imgTag;
			}
			// Construct the new image URL
			const imageUrl = `/uploads/posts/${postId}/${storedFilename}`;
			// Replace the src attribute in the <img> tag with the new image URL
			if (/src=["'][^"']*["']/i.test(imgTag)) {
				return imgTag.replace(/src=["'][^"']*["']/i, `src="${imageUrl}"`);
			}

			return imgTag.replace('<img', `<img src="${imageUrl}"`);
		});
	}

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

		const [items, total] = await this.prisma.$transaction([
			this.prisma.post.findMany({
				where,
				skip: query.skip,
				take: query.take,
				orderBy: { createdAt: 'desc' },
				include: {
					author: {
						select: { id: true, name: true, email: true },
					},
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
				author: {
					select: { id: true, name: true, email: true },
				},
			},
		});

		if (!post) {
			throw new NotFoundException(this.i18n.t('posts.error.post_not_found_with_id', { args: { id } }));
		}

		return post;
	}

	async findAllPublic(query: { q?: string; skip?: number; take?: number }) {
		const where: any = { isPublished: true };

		if (query.q) {
			where.OR = [
				{ title: { contains: query.q, mode: 'insensitive' } },
				{ slug: { contains: query.q, mode: 'insensitive' } },
			];
		}

		const [items, total] = await this.prisma.$transaction([
			this.prisma.post.findMany({
				where,
				skip: query.skip ?? 0,
				take: query.take ?? 10,
				orderBy: { createdAt: 'desc' },
				select: {
					id: true,
					title: true,
					slug: true,
					summary: true,
					thumbnail: true,
					createdAt: true,
					updatedAt: true,
					author: {
						select: { id: true, name: true },
					},
				},
			}),
			this.prisma.post.count({ where }),
		]);

		return { items, total };
	}

	async findOneBySlug(slug: string) {
		const post = await this.prisma.post.findFirst({
			where: { slug, isPublished: true },
			include: {
				author: {
					select: { id: true, name: true },
				},
			},
		});

		if (!post) {
			throw new NotFoundException(this.i18n.t('posts.error.post_not_found'));
		}

		return post;
	}

	async create(
		dto: CreatePostDto,
		files: { thumbnail?: Express.Multer.File[]; contentImages?: Express.Multer.File[] },
		authorId: number,
	) {
		let createdPostDir: string | null = null;

		try {
			const post = await this.prisma.$transaction(async (tx) => {
				const slug = this.generateSlug(dto.title);

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

				createdPostDir = join(this.postsRootDir, String(createdPost.id));
				fs.mkdirSync(createdPostDir, { recursive: true });

				let thumbnailUrl: string | null = null;
				// Map to keep track of original filenames and their corresponding stored filenames
				const filenameMap = new Map<string, string>();
				const thumbnailFile = files.thumbnail?.[0];
				const contentImages = files.contentImages ?? [];

				if (thumbnailFile) {
					const thumbnailTargetPath = join(createdPostDir, thumbnailFile.filename);
					fs.renameSync(thumbnailFile.path, thumbnailTargetPath);
					thumbnailUrl = `/uploads/posts/${createdPost.id}/${thumbnailFile.filename}`;
				}

				for (const file of contentImages) {
					const tempFilePath = file.path;
					const targetFilePath = join(createdPostDir, file.filename);

					fs.renameSync(tempFilePath, targetFilePath); // Move the file to the post's directory
					filenameMap.set(file.originalname, file.filename); // Map original filename to stored filename
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

			const totalUploadedFiles = (files.thumbnail?.length ?? 0) + (files.contentImages?.length ?? 0);
			this.logger.log(`Created post ${post.id} with ${totalUploadedFiles} uploaded file(s)`);

			return {
				success: true,
				message: this.i18n.t('posts.success.post_created'),
				data: post,
			};
		} catch (error) {
			if (createdPostDir && fs.existsSync(createdPostDir)) {
				fs.rmSync(createdPostDir, { recursive: true, force: true });
			}

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
            // 1. Kiểm tra ID bài viết xem có tồn tại không
            const existingPost = await this.findOne(id);

            // Xác định thư mục chứa ảnh của bài viết này
            const postDir = join(this.postsRootDir, String(id));
            if (!fs.existsSync(postDir)) {
                fs.mkdirSync(postDir, { recursive: true });
            }

            let thumbnailUrl = existingPost.thumbnail;
            const filenameMap = new Map<string, string>();
            const thumbnailFile = files?.thumbnail?.[0];
            const contentImages = files?.contentImages ?? [];

            // 2. Xử lý File Thumbnail
            if (thumbnailFile) {
                // Di chuyển ảnh mới vào thư mục
                const thumbnailTargetPath = join(postDir, thumbnailFile.filename);
                fs.renameSync(thumbnailFile.path, thumbnailTargetPath);
                
                // Cập nhật lại đường dẫn URL
                thumbnailUrl = `/uploads/posts/${id}/${thumbnailFile.filename}`;

                // (Tùy chọn) Xóa ảnh bìa cũ để giải phóng ổ cứng
                if (existingPost.thumbnail) {
                    const oldThumbnailName = basename(existingPost.thumbnail);
                    const oldThumbnailPath = join(postDir, oldThumbnailName);
                    if (fs.existsSync(oldThumbnailPath)) {
                        fs.unlinkSync(oldThumbnailPath);
                    }
                }
            }

            // 3. Xử lý File ContentImages
            for (const file of contentImages) {
                const tempFilePath = file.path;
                const targetFilePath = join(postDir, file.filename);

                fs.renameSync(tempFilePath, targetFilePath);
                filenameMap.set(file.originalname, file.filename);
                filenameMap.set(basename(file.originalname), file.filename);
            }

            // 4. Map HTML
            let mappedContent = existingPost.content;
            if (dto.content !== undefined) {
                // Chỉ chạy lại hàm map ảnh khi có nội dung mới gửi lên
                mappedContent = this.replaceInlineImageSources(dto.content, id, filenameMap);
            }

            // Nếu người dùng có đổi title thì phải sinh lại slug mới tương ứng
            const slug = dto.title ? this.generateSlug(dto.title) : existingPost.slug;
			
			//5. Garbage Collector: Xóa các ảnh rác không còn được tham chiếu trong HTML 
			if (fs.existsSync(postDir)) {
				const allFilesInDir = fs.readdirSync(postDir);
				
				for (const file of allFilesInDir) {
					// Bỏ qua nếu file đang xét là Thumbnail hiện tại
					if (thumbnailUrl && thumbnailUrl.includes(file)) continue;

					// Nếu tên file không còn tồn tại trong HTML mới -> Người dùng đã xóa ảnh này
					if (!mappedContent.includes(file)) {
						const filePath = join(postDir, file);
						fs.unlinkSync(filePath); // Xóa file vật lý khỏi ổ cứng
						this.logger.log(`Garbage Collector: Đã xóa ảnh rác ${file} của bài viết ${id}`);
					}
				}
			}

            // 6. Lưu DB
            const updatedPost = await this.prisma.post.update({
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

            const totalUploadedFiles = (files.thumbnail?.length ?? 0) + (files.contentImages?.length ?? 0);
            this.logger.log(`Updated post ${id} successfully with ${totalUploadedFiles} new uploaded file(s)`);

            return {
                success: true,
                message: this.i18n.t('posts.success.post_updated'),
                data: updatedPost,
            };
        } catch (error) {
            this.logger.error(`Failed to update post ${id}`, error instanceof Error ? error.stack : undefined);
            
            // Giữ nguyên lỗi 404 nếu không tìm thấy bài viết
            if (error instanceof NotFoundException) {
                throw error;
            }
            
            throw new BadRequestException(this.i18n.t('posts.error.post_update_failed'));
        }
    }
}
