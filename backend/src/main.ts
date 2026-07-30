import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

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

  await app.listen(process.env.PORT ?? 3001);
  console.log(`🚀 Server đang chạy tại: http://localhost:${process.env.PORT ?? 3001}`);
}
bootstrap();