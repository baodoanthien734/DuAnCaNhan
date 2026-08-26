import { IsString, IsOptional, IsNumber, IsBoolean, IsEnum, IsArray, ValidateNested, Min, IsNotEmpty, MaxLength, ArrayMaxSize, Matches } from 'class-validator';
import { i18nValidationMessage } from 'nestjs-i18n';
import { Type } from 'class-transformer';
import { ProductStatus } from '@prisma/client';
import { CreateVariantDto } from '../nested/variant.dto';
import { CreateCustomizationDto } from '../nested/customization.dto';

export class CreateProductDto {
  @IsString({ message: i18nValidationMessage('products.validation.name_string') })
  @IsNotEmpty({ message: i18nValidationMessage('products.validation.name_required') })
  @MaxLength(200, { message: i18nValidationMessage('products.validation.name_max_length') })
  @Matches(/[a-zA-Z\p{L}]/u, { 
    message: i18nValidationMessage('products.validation.name_invalid_format') 
  })
  name!: string;


  @IsOptional()
  @IsString({ message: i18nValidationMessage('products.validation.slug_string') })
  @MaxLength(255, { message: i18nValidationMessage('products.validation.slug_max_length') })
  @Matches(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, { 
    message: i18nValidationMessage('products.validation.slug_invalid_format') 
  })
  slug?: string;


  @IsNumber({}, { message: i18nValidationMessage('products.validation.category_id_number') })
  @IsNotEmpty({ message: i18nValidationMessage('products.validation.category_id_required') })
  categoryId!: number;


  @IsOptional()
  @IsString({ message: i18nValidationMessage('products.validation.description_string') })
  description?: string;


  @IsNumber({}, { message: i18nValidationMessage('products.validation.base_price_number') })
  @Min(0, { message: i18nValidationMessage('products.validation.base_price_min') })
  @IsNotEmpty({ message: i18nValidationMessage('products.validation.base_price_required') })
  basePrice!: number;


  @IsOptional()
  @IsArray({ message: i18nValidationMessage('products.validation.images_array') })
  @IsString({ each: true, message: i18nValidationMessage('products.validation.images_string') })
  @ArrayMaxSize(5, { message: i18nValidationMessage('products.validation.images_max_count') }) 
  @Matches(/\.(jpg|jpeg|png|webp|gif)(\?.*)?$/i, { 
    each: true, 
    message: i18nValidationMessage('products.validation.images_invalid_format')
  })
  images?: string[];


  @IsOptional()
  @IsBoolean({ message: i18nValidationMessage('products.validation.is_private_boolean') })
  isPrivate?: boolean;


  @IsOptional()
  @IsNumber({}, { message: i18nValidationMessage('products.validation.private_for_user_number') })
  privateForUserId?: number;


  @IsOptional()
  @IsEnum(ProductStatus, { message: i18nValidationMessage('products.validation.status_invalid') })
  status?: ProductStatus;


  @IsOptional()
  @IsArray({ message: i18nValidationMessage('products.validation.variants_array') })
  @ValidateNested({ each: true })
  @Type(() => CreateVariantDto)
  variants?: CreateVariantDto[];


  @IsOptional()
  @IsArray({ message: i18nValidationMessage('products.validation.customizations_array') })
  @ValidateNested({ each: true })
  @Type(() => CreateCustomizationDto)
  customizations?: CreateCustomizationDto[];
}