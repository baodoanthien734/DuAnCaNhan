import { IsArray, IsInt, IsOptional, IsString, IsIn, ArrayNotEmpty } from 'class-validator';
import { i18nValidationMessage } from 'nestjs-i18n';

export class BulkUpdateProductDto {
  @IsArray()
  @ArrayNotEmpty({ message: i18nValidationMessage('products.error.product_ids_not_empty') })
  @IsInt({ each: true })
  productIds!: number[];

  @IsOptional()
  @IsInt()
  categoryId?: number;

  @IsOptional()
  @IsString()
  @IsIn(['DRAFT', 'ACTIVE', 'ARCHIVED']) 
  status?: string;
}