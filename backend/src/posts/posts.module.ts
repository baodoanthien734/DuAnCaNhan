import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { PostsController } from './posts.controller';
import { PublicPostsController } from './public-posts.controller';
import { PostsService } from './posts.service';

@Module({
	imports: [PrismaModule],
	controllers: [PostsController, PublicPostsController],
	providers: [PostsService],
})
export class PostsModule {}
