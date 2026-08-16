import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AcceptLanguageResolver, I18nModule, I18nJsonLoader } from 'nestjs-i18n';
import { join } from 'path';
import { PrismaModule } from './prisma/prisma.module';
import { MailModule } from './mail/mail.module';
import { AuthModule } from './auth/auth.module';
import { CategoriesModule } from './categories/categories.module';
import { UploadsModule } from './uploads/uploads.module';
import { ProductsModule } from './products/products.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true, // Cho phép dùng ConfigService ở mọi nơi
    }),
    I18nModule.forRoot({
      fallbackLanguage: 'vi',
      loaderOptions: {
        // 👇 ĐÃ SỬA: Thêm '..' để lùi ra một cấp (từ dist/src lùi ra dist, rồi mới chui vào i18n)
        path: join(__dirname, '..', 'i18n/'), 
        filePattern: '*.json',
      },
      loader: I18nJsonLoader,
      resolvers: [
        { use: AcceptLanguageResolver, options: { matchType: 'strict-loose' } },
      ],
      // 👇 ĐÃ SỬA: Dùng process.cwd() để luôn sinh file vào đúng thư mục gốc src/ dù chạy ở môi trường nào
      typesOutputPath: join(process.cwd(), 'src/generated/i18n.generated.ts'),
    }),
    PrismaModule,
    MailModule,
    AuthModule,
    UploadsModule,
    CategoriesModule,
    ProductsModule,
  ],
})
export class AppModule {}