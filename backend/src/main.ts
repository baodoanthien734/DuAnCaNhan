import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { join } from 'path';
import { NestExpressApplication } from '@nestjs/platform-express';
// 👇 1. Import thêm 2 công cụ của nestjs-i18n
import { I18nValidationExceptionFilter, I18nValidationPipe } from 'nestjs-i18n';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);

  // 👇 2. Đổi ValidationPipe mặc định thành I18nValidationPipe (Giữ nguyên các settings cũ của bạn)
  app.useGlobalPipes(
    new I18nValidationPipe({
      whitelist: true, // Tự động loại bỏ các field thừa không khai báo trong DTO
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  // 👇 3. Thêm bộ lọc này để bắt và dịch chuỗi "key|args" thành thông báo hoàn chỉnh
  app.useGlobalFilters(
    new I18nValidationExceptionFilter({
      detailedErrors: false, 
    }),
  );

  // 4. Mở CORS cho Frontend Next.js (Giữ nguyên)
  app.enableCors({
    origin: 'http://localhost:3000', // ĐỊa chỉ Frontend
    credentials: true,
  });

  // 5. Phục vụ thư mục public/uploads (Giữ nguyên)
  app.useStaticAssets(join(process.cwd(), 'public'));

  await app.listen(process.env.PORT ?? 3001);
  console.log(`🚀 Server đang chạy tại: http://localhost:${process.env.PORT ?? 3001}`);
}
bootstrap();