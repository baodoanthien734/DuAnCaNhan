import { IsString, IsOptional, IsNumber, Min, IsUrl, IsNotEmpty, MaxLength, Matches } from 'class-validator';
import { i18nValidationMessage } from 'nestjs-i18n';

export class CreateVariantDto {
  @IsString({ message: i18nValidationMessage('products.validation.variant_name_string') })
  @IsNotEmpty({ message: i18nValidationMessage('products.validation.variant_name_required') })
  @MaxLength(100, { message: i18nValidationMessage('products.validation.variant_name_max_length') })
  @Matches(/[a-zA-Z\p{L}]/u, { 
    message: i18nValidationMessage('products.validation.name_invalid_format') 
  })
  name!: string;


  @IsOptional()
  @IsString({ message: i18nValidationMessage('products.validation.sku_string') })
  @MaxLength(50, { message: i18nValidationMessage('products.validation.sku_max_length') })
  @Matches(/^[a-zA-Z0-9\-_]+$/, { 
    message: i18nValidationMessage('products.validation.sku_invalid_format') 
  })
  sku?: string;


  @IsNumber({}, { message: i18nValidationMessage('products.validation.variant_price_number') })
  @Min(0, { message: i18nValidationMessage('products.validation.variant_price_min') })
  @IsNotEmpty({ message: i18nValidationMessage('products.validation.variant_price_required') })
  price!: number;


  @IsOptional()
  @IsNumber({}, { message: i18nValidationMessage('products.validation.variant_stock_number') })
  @Min(0, { message: i18nValidationMessage('products.validation.variant_stock_min') })
  stock?: number;


  @IsOptional()
  @IsString({ message: i18nValidationMessage('products.validation.variant_image_string') })
  @Matches(/\.(jpg|jpeg|png|webp|gif)(\?.*)?$/i, { 
    each: true, 
    message: i18nValidationMessage('products.validation.images_invalid_format')
  })
  image?: string;


  @IsOptional()
  @IsNumber({}, { message: i18nValidationMessage('products.validation.variant_id_number') })
  id?: number;
}