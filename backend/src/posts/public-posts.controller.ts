import { Controller, Get, Param, Query } from '@nestjs/common';
import { PostsService } from './posts.service';

@Controller('posts')
export class PublicPostsController {
	constructor(private readonly postsService: PostsService) {}

	@Get()
	async findAllPublic(
		@Query('q') q?: string,
		@Query('skip') skip?: string,
		@Query('take') take?: string,
	) {
		return this.postsService.findAllPublic({
			q,
			skip: skip ? Number(skip) : undefined,
			take: take ? Number(take) : undefined,
		});
	}

	@Get(':slug')
	async findOneBySlug(@Param('slug') slug: string) {
		return this.postsService.findOneBySlug(slug);
	}
}