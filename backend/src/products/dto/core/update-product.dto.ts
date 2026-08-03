import { PartialType, OmitType } from '@nestjs/mapped-types'; // Lưu ý: dùng @nestjs/swagger nếu có tích hợp Swagger
import { CreateProductDto } from './create-product.dto';
import { IsOptional, IsArray } from 'class-validator';

// 1. Dùng OmitType để "loại bỏ" sự khắt khe của 2 mảng này từ CreateProductDto
export class UpdateProductDto extends PartialType(
  OmitType(CreateProductDto, ['variants', 'customizations'] as const)
) {
  // 2. Khai báo lại chúng dưới dạng mảng tự do, giúp NestJS vui vẻ chấp nhận trường 'id'
  @IsOptional()
  @IsArray()
  variants?: any[];

  @IsOptional()
  @IsArray()
  customizations?: any[];
}