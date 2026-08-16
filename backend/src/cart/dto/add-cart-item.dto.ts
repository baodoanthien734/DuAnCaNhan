import { IsInt, IsOptional, IsPositive, Min } from 'class-validator';

export class AddCartItemDto {
  @IsInt()
  @IsPositive()
  productId!: number;

  @IsOptional()
  @IsInt()
  @IsPositive()
  variantId?: number;

  @IsInt()
  @Min(1)
  quantity!: number;

  // JSON chứa các tùy chọn cá nhân hóa (như tên thêu, chọn charm...)
  @IsOptional()
  customizations?: any;
}