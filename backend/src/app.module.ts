import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { AcceptLanguageResolver, I18nModule, I18nJsonLoader } from 'nestjs-i18n';
import { ServeStaticModule } from '@nestjs/serve-static';
import { join } from 'path';
import { PrismaModule } from './prisma/prisma.module';
import { MailModule } from './mail/mail.module';
import { AuthModule } from './auth/auth.module';
import { CategoriesModule } from './categories/categories.module';
import { PostsModule } from './posts/posts.module';
import { UploadsModule } from './uploads/uploads.module';
import { ProductsModule } from './products/products.module';
import { CartModule } from './cart/cart.module';
import { OrdersModule } from './orders/orders.module';
import { UsersModule } from './users/users.module';
import { ReviewsModule } from './reviews/reviews.module';
import { AdminCustomersModule } from './admin-customers/admin-customers.module';
import { DashboardModule } from './dashboard/dashboard.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true, // Cho phép dùng ConfigService ở mọi nơi
    }),
    ScheduleModule.forRoot(),
    ServeStaticModule.forRoot({
      rootPath: join(__dirname, '..', 'public'), // Trỏ đúng vào thư mục public ở root
      serveRoot: '/', // URL truy cập sẽ bắt đầu từ root
    }),
    I18nModule.forRoot({
      fallbackLanguage: 'vi',
      loaderOptions: {
        path: join(__dirname, '..', 'i18n/'), 
        filePattern: '*.json',
      },
      loader: I18nJsonLoader,
      resolvers: [
        { use: AcceptLanguageResolver, options: { matchType: 'strict-loose' } },
      ],
      typesOutputPath: join(process.cwd(), 'src/generated/i18n.generated.ts'),
    }),
    PrismaModule,
    MailModule,
    AuthModule,
    UploadsModule,
    CategoriesModule,
    PostsModule,
    ProductsModule,
    CartModule,
    OrdersModule,
    UsersModule,
    ReviewsModule,
    AdminCustomersModule,
    DashboardModule,
  ],
})
export class AppModule {}