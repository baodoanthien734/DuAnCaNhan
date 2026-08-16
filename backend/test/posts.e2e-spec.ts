import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import * as fs from 'fs';
import { join } from 'path';
import request from 'supertest';
import { I18nService } from 'nestjs-i18n';
import { PrismaService } from '../src/prisma/prisma.service';
import { RolesGuard } from '../src/auth/guards/roles.guard';
import { JwtAuthGuard } from '../src/auth/guards/jwt-auth.guard';
import { PostsController } from '../src/posts/posts.controller';
import { PostsService } from '../src/posts/posts.service';
import { PublicPostsController } from '../src/posts/public-posts.controller';

describe('PostsController (e2e)', () => {
  let app: INestApplication;

  const createdPost = {
    id: 123,
    title: 'Bai viet test',
    slug: 'bai-viet-test-123',
    summary: 'Tom tat',
    content: '',
    thumbnail: null as string | null,
    isPublished: true,
    authorId: 99,
    createdAt: new Date('2026-08-04T00:00:00.000Z'),
    updatedAt: new Date('2026-08-04T00:00:00.000Z'),
  };

  const mockTx = {
    post: {
      create: jest.fn(async ({ data }: { data: typeof createdPost }) => ({
        ...createdPost,
        ...data,
      })),
      update: jest.fn(async ({ data }: { data: Partial<typeof createdPost> }) => ({
        ...createdPost,
        ...data,
      })),
      findMany: jest.fn(),
      count: jest.fn(),
      findUnique: jest.fn(),
      findFirst: jest.fn(),
    },
  };

  const mockPrismaService = {
    $transaction: jest.fn(async (input: unknown) => {
      if (typeof input === 'function') {
        return input(mockTx);
      }

      return Promise.all(input as Promise<unknown>[]);
    }),
    post: mockTx.post,
  };

  const mockI18nService = {
    t: jest.fn((key: string) => {
      const messages: Record<string, string> = {
        'posts.success.post_created': 'Tạo bài viết thành công',
        'posts.error.post_create_failed': 'Không thể tạo bài viết. Vui lòng thử lại',
        'posts.error.post_not_found': 'Bài viết không tồn tại',
      };

      return messages[key] ?? key;
    }),
  };

  beforeAll(async () => {
    jest.spyOn(JwtAuthGuard.prototype, 'canActivate').mockImplementation((context) => {
      const req = context.switchToHttp().getRequest();
      req.user = { id: 99, roles: ['ADMIN'] };
      return true as never;
    });
    jest.spyOn(RolesGuard.prototype, 'canActivate').mockReturnValue(true);

    const moduleFixture: TestingModule = await Test.createTestingModule({
      controllers: [PostsController, PublicPostsController],
      providers: [
        PostsService,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: I18nService, useValue: mockI18nService },
        RolesGuard,
      ],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );
    await app.init();
  });

  afterEach(() => {
    jest.clearAllMocks();
    fs.rmSync(join(process.cwd(), 'public', 'uploads', 'posts', String(createdPost.id)), {
      recursive: true,
      force: true,
    });
    fs.rmSync(join(process.cwd(), 'public', 'uploads', 'tmp'), {
      recursive: true,
      force: true,
    });
  });

  afterAll(async () => {
    jest.restoreAllMocks();
    await app.close();
  });

  it('POST /admin/posts should create a post with thumbnail and mapped content images', async () => {
    const html = '<p>Noi dung</p><img data-filename="content.jpg" src="data:image/jpeg;base64,abc123" />';

    const response = await request(app.getHttpServer())
      .post('/admin/posts')
      .field('title', 'Bai viet test')
      .field('summary', 'Tom tat')
      .field('content', html)
      .field('isPublished', 'true')
      .attach('thumbnail', Buffer.from('thumbnail-binary'), { filename: 'thumb.jpg', contentType: 'image/jpeg' })
      .attach('contentImages', Buffer.from('content-binary'), { filename: 'content.jpg', contentType: 'image/jpeg' })
      .expect(201);

    expect(response.body.message).toBe('Tạo bài viết thành công');
    expect(response.body.data.thumbnail).toMatch(/^\/uploads\/posts\/123\/\d+-thumb\.jpg$/);
    expect(response.body.data.content).toContain('/uploads/posts/123/');
    expect(response.body.data.content).toContain('content.jpg');
    expect(response.body.data.content).not.toContain('data:image/jpeg;base64,abc123');

    expect(fs.existsSync(join(process.cwd(), 'public', 'uploads', 'posts', '123'))).toBe(true);
    expect(mockTx.post.create).toHaveBeenCalled();
    expect(mockTx.post.update).toHaveBeenCalled();
  });
});