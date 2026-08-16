import { IsString, IsOptional, IsInt, IsBoolean } from 'class-validator';
import { Type, Transform } from 'class-transformer'; // Bổ sung thư viện này

export class CreateCategoryDto {
  @IsString()
  name!: string;

  @IsOptional()
  @IsString()
  slug?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @Type(() => Number) // Ép chuỗi thành số nguyên
  @IsInt()
  parentId?: number;

  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true || value === 1 || value === '1') // Ép chuỗi 'true' thành boolean
  @IsBoolean()
  isActive?: boolean;

  @IsOptional()
  @Type(() => Number) // Ép chuỗi thành số nguyên
  @IsInt()
  position?: number;

  @IsOptional()
  @IsString()
  image?: string;

  @IsOptional()
  @IsString()
  metaTitle?: string;

  @IsOptional()
  @IsString()
  metaDesc?: string;

  @IsOptional()
  @IsString()
  removeImage?: string;
}