import { IsString, IsOptional, IsNumber, Min, IsUrl, IsNotEmpty, MaxLength } from 'class-validator';
import { i18nValidationMessage } from 'nestjs-i18n';

export class CreateVariantDto {
  @IsString({ message: i18nValidationMessage('products.validation.variant_name_string') })
  @IsNotEmpty({ message: i18nValidationMessage('products.validation.variant_name_required') })
  @MaxLength(100, { message: i18nValidationMessage('products.validation.variant_name_max_length') })
  name!: string;


  @IsOptional()
  @IsString({ message: i18nValidationMessage('products.validation.sku_string') })
  @MaxLength(50, { message: i18nValidationMessage('products.validation.sku_max_length') })
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
  image?: string;


  @IsOptional()
  @IsNumber({}, { message: i18nValidationMessage('products.validation.variant_id_number') })
  id?: number;
}