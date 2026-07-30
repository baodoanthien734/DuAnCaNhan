import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';
import { join } from 'path';
import { NestExpressApplication } from '@nestjs/platform-express';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);

  // 1. Tự động Validate DTO
   app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true, // Tự động loại bỏ các field thừa không khai báo trong DTO
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  // 2. Mở CORS cho Frontend Next.js
  app.enableCors({
    origin: 'http://localhost:3000', // ĐỊa chỉ Frontend
    credentials: true,
  });

  // 3. Phục vụ thư mục public/uploads
  app.useStaticAssets(join(process.cwd(), 'public'));

  await app.listen(process.env.PORT ?? 3001);
  console.log(`🚀 Server đang chạy tại: http://localhost:${process.env.PORT ?? 3001}`);
}
bootstrap();