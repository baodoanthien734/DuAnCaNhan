import { IsString, IsOptional, IsInt, IsBoolean, IsNotEmpty, MaxLength, Matches } from 'class-validator';
import { Type, Transform } from 'class-transformer';
import { i18nValidationMessage } from 'nestjs-i18n';


export class CreateCategoryDto {
  @IsString({ message: i18nValidationMessage('categories.validation.name_string') })
  @IsNotEmpty({ message: i18nValidationMessage('categories.validation.name_required') })
  @MaxLength(200, { message: i18nValidationMessage('categories.validation.name_max_length') })
  @Matches(/[a-zA-Z\p{L}]/u, { message: i18nValidationMessage('categories.validation.name_invalid_format') })
  name!: string;


  @IsOptional()
  @IsString({ message: i18nValidationMessage('categories.validation.slug_string') })
  @MaxLength(255, { message: i18nValidationMessage('categories.validation.slug_max_length') })
  @Matches(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, { 
    message: i18nValidationMessage('categories.validation.slug_invalid_format') 
  })
  slug?: string;


  @IsOptional()
  @IsString({ message: i18nValidationMessage('categories.validation.description_string') })
  @MaxLength(1000, { message: i18nValidationMessage('categories.validation.description_max_length') })
  description?: string;


  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: i18nValidationMessage('categories.validation.parent_id_int') })
  parentId?: number;


  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true || value === 1 || value === '1')
  @IsBoolean({ message: i18nValidationMessage('categories.validation.is_active_boolean') })
  isActive?: boolean;


  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: i18nValidationMessage('categories.validation.position_int') })
  position?: number;


  @IsOptional()
  @IsString({ message: i18nValidationMessage('categories.validation.image_string') })
  @Matches(/\.(jpg|jpeg|png|webp|gif)(\?.*)?$/i, { 
      each: true, 
      message: i18nValidationMessage('categories.validation.image_invalid_format')
  }) 
  image?: string;


  @IsOptional()
  @IsString({ message: i18nValidationMessage('categories.validation.meta_title_string') })
  @MaxLength(100, { message: i18nValidationMessage('categories.validation.meta_title_max_length') })
  metaTitle?: string;


  @IsOptional()
  @IsString({ message: i18nValidationMessage('categories.validation.meta_desc_string') })
  @MaxLength(300, { message: i18nValidationMessage('categories.validation.meta_desc_max_length') })
  metaDesc?: string;

  @IsOptional()
  @IsString()
  removeImage?: string;
}