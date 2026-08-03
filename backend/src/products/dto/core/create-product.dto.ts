import { IsString, IsOptional, IsNumber, IsBoolean, IsEnum, IsArray, ValidateNested, Min } from 'class-validator';
import { Type } from 'class-transformer';
import { ProductStatus } from '@prisma/client';
import { CreateVariantDto } from '../nested/variant.dto';
import { CreateCustomizationDto } from '../nested/customization.dto';

export class CreateProductDto {
  @IsString()
  name!: string;

  @IsNumber()
  categoryId!: number;

  @IsOptional()
  @IsString()
  description?: string;

  @IsNumber()
  @Min(0)
  basePrice!: number;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  images?: string[];

  @IsOptional()
  @IsBoolean()
  isPrivate?: boolean;

  @IsOptional()
  @IsNumber()
  privateForUserId?: number;

  @IsOptional()
  @IsEnum(ProductStatus)
  status?: ProductStatus;

  // Validate mảng Variants lồng nhau
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateVariantDto)
  variants?: CreateVariantDto[];

  // Validate mảng Customizations lồng nhau
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateCustomizationDto)
  customizations?: CreateCustomizationDto[];
}