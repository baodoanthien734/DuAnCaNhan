import { PartialType, OmitType } from '@nestjs/mapped-types'; // Hoặc @nestjs/swagger
import { CreateProductDto } from './create-product.dto';
import { IsOptional, IsArray, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { CreateCustomizationDto } from '../nested/customization.dto'; // Nhớ kiểm tra lại đường dẫn import cho đúng

export class UpdateProductDto extends PartialType(
  OmitType(CreateProductDto, ['variants', 'customizations'] as const)
) {
  // 1. Variants tạm giữ nguyên any[] nếu bạn chưa thêm 'id?: number' vào CreateVariantDto
  @IsOptional()
  @IsArray()
  variants?: any[];

  // 2. 👇 TRẢ LẠI SỰ TRONG SẠCH CHO CUSTOMIZATIONS
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateCustomizationDto)
  customizations?: CreateCustomizationDto[];
}