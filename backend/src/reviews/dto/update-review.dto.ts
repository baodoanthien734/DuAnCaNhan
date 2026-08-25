import { IsInt, IsOptional, IsString, IsArray, Min, Max, MaxLength, IsUrl } from 'class-validator';
import { i18nValidationMessage } from 'nestjs-i18n';


export class UpdateReviewDto {
  @IsOptional()
  @IsInt({ message: i18nValidationMessage('reviews.validation.rating_int') })
  @Min(1, { message: i18nValidationMessage('reviews.validation.rating_min') })
  @Max(5, { message: i18nValidationMessage('reviews.validation.rating_max') })
  rating?: number;


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