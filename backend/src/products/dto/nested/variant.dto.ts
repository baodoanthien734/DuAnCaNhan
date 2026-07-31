import { IsString, IsOptional, IsNumber, Min, IsUrl } from 'class-validator';

export class CreateVariantDto {
  @IsString()
  name!: string;

  @IsOptional()
  @IsString()
  sku?: string;

  @IsNumber()
  @Min(0)
  price!: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  stock?: number;

  @IsOptional()
  @IsString() // Có thể đổi thành @IsUrl() nếu bạn muốn validate URL ảnh chặt chẽ hơn
  image?: string;

  @IsOptional()
  @IsNumber()
  id?: number;
}