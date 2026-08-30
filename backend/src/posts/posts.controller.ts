import { Body, Controller, Get, Param, Post, Patch, Query, Req, UploadedFiles, UseGuards, UseInterceptors, BadRequestException } from '@nestjs/common';
import { FileFieldsInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import * as fs from 'fs';
import { basename } from 'path';
import { Roles } from '../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { CreatePostDto } from './dto/create-post.dto';
import { UpdatePostDto } from './dto/update-post.dto';
import { PostsService } from './posts.service';

const TMP_UPLOAD_DIR = './public/uploads/tmp';

fs.mkdirSync(TMP_UPLOAD_DIR, { recursive: true });

@Controller('admin/posts')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN')
export class PostsController {
	constructor(private readonly postsService: PostsService) {}

	@Get()
	async findAll(
		@Query('q') q?: string,
		@Query('isPublished') isPublished?: string,
		@Query('skip') skip?: string,
		@Query('take') take?: string,
	) {
		return this.postsService.findAll({
			q,
			isPublished: isPublished === undefined ? undefined : isPublished === 'true',
			skip: skip ? Number(skip) : undefined,
			take: take ? Number(take) : undefined,
		});
	}

	@Get(':id')
	async findOne(@Param('id') id: string) {
		return this.postsService.findOne(Number(id));
	}

	@Post()
	@UseInterceptors(
        FileFieldsInterceptor(
            [
                { name: 'thumbnail', maxCount: 1 },
                { name: 'contentImages', maxCount: 10 },
            ],
            {
                storage: diskStorage({
                    destination: TMP_UPLOAD_DIR,
                    filename: (_req, file, callback) => {
                        const originalName = basename(file.originalname);
                        callback(null, `${Date.now()}-${originalName}`);
                    },
                }),
                // THÊM: Chặn file mã độc
                fileFilter: (_req, file, callback) => {
                    if (!file.mimetype.startsWith('image/')) {
                        return callback(new BadRequestException('posts.error.only_images_allowed'), false);
                    }
                    callback(null, true);
                },
                // THÊM: Chặn file vượt quá 5MB
                limits: { fileSize: 5 * 1024 * 1024 },
            },
        ),
    )
	async create(
		@Body() dto: CreatePostDto,
		@UploadedFiles()
		files: { thumbnail?: Express.Multer.File[]; contentImages?: Express.Multer.File[] } = {},
		@Req() req: { user: { id: number } },
	) {
		return this.postsService.create(dto, files, req.user.id);
	}

	@Patch(':id')
    @UseInterceptors(
        FileFieldsInterceptor(
            [
                { name: 'thumbnail', maxCount: 1 },
                { name: 'contentImages', maxCount: 10 },
            ],
            {
                storage: diskStorage({
                    destination: TMP_UPLOAD_DIR,
                    filename: (_req, file, callback) => {
                        const originalName = basename(file.originalname);
                        callback(null, `${Date.now()}-${originalName}`);
                    },
                }),
                // THÊM CHẶN VÀO ĐÂY
                fileFilter: (_req, file, callback) => {
                    if (!file.mimetype.startsWith('image/')) {
                        return callback(new BadRequestException('posts.error.only_images_allowed'), false);
                    }
                    callback(null, true);
                },
                limits: { fileSize: 5 * 1024 * 1024 },
            },
        ),
    )
    async update(
        @Param('id') id: string,
        @Body() dto: UpdatePostDto,
        @UploadedFiles()
        files: { thumbnail?: Express.Multer.File[]; contentImages?: Express.Multer.File[] } = {},
    ) {
        return this.postsService.update(Number(id), dto, files);
    }

    // ==============================================================
    // PRODUCT TAGGING ROUTES
    // ==============================================================

    @Get(':id/products')
    async getTaggedProducts(@Param('id') id: string) {
        return this.postsService.getTaggedProducts(Number(id));
    }

    @Patch(':id/products')
    async updateTaggedProducts(
        @Param('id') id: string,
        @Body('productIds') productIds: number[],
    ) {
        return this.postsService.updateTaggedProducts(Number(id), productIds || []);
    }
}
