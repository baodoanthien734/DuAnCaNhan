import { IsInt, IsNotEmpty, IsOptional, IsString, IsArray, Min, Max, MaxLength, IsUrl } from 'class-validator';
import { i18nValidationMessage } from 'nestjs-i18n';


export class CreateReviewDto {
  @IsInt({ message: i18nValidationMessage('reviews.validation.product_id_int') })
  @IsNotEmpty({ message: i18nValidationMessage('reviews.validation.product_id_required') })
  productId!: number;


  @IsInt({ message: i18nValidationMessage('reviews.validation.order_id_int') })
  @IsNotEmpty({ message: i18nValidationMessage('reviews.validation.order_id_required') })
  orderId!: number;


  @IsInt({ message: i18nValidationMessage('reviews.validation.rating_int') })
  @Min(1, { message: i18nValidationMessage('reviews.validation.rating_min') })
  @Max(5, { message: i18nValidationMessage('reviews.validation.rating_max') })
  @IsNotEmpty({ message: i18nValidationMessage('reviews.validation.rating_required') })
  rating!: number;


  @IsOptional()
  @IsString({ message: i18nValidationMessage('reviews.validation.comment_string') })
  @MaxLength(1000, { message: i18nValidationMessage('reviews.validation.comment_max_length') })
  comment?: string;


  @IsOptional()
  @IsArray({ message: i18nValidationMessage('reviews.validation.images_array') })
  @IsString({ each: true, message: i18nValidationMessage('reviews.validation.images_string') })
  @IsUrl({}, { each: true, message: i18nValidationMessage('reviews.validation.images_url') })
  @MaxLength(5, { message: i18nValidationMessage('reviews.validation.images_max_count') })
  images?: string[];
}