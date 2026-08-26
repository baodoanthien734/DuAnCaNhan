import { IsString, IsOptional, IsInt, IsBoolean, IsNotEmpty, MaxLength } from 'class-validator';
import { Type, Transform } from 'class-transformer';
import { i18nValidationMessage } from 'nestjs-i18n';


export class CreateCategoryDto {
  @IsString({ message: i18nValidationMessage('categories.validation.name_string') })
  @IsNotEmpty({ message: i18nValidationMessage('categories.validation.name_required') })
  @MaxLength(200, { message: i18nValidationMessage('categories.validation.name_max_length') })
  name!: string;


  @IsOptional()
  @IsString({ message: i18nValidationMessage('categories.validation.slug_string') })
  @MaxLength(255, { message: i18nValidationMessage('categories.validation.slug_max_length') })
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
  image?: string;


  @IsOptional()
  @IsString({ message: i18nValidationMessage('categories.validation.meta_title_string') })
  @MaxLength(100, { message: i18nValidationMessage('categories.validation.meta_title_max_length') })
  metaTitle?: string;


  @IsOptional()
  @IsString({ message: i18nValidationMessage('categories.validation_meta_desc_string') })
  @MaxLength(300, { message: i18nValidationMessage('categories.validation.meta_desc_max_length') })
  metaDesc?: string;

  @IsOptional()
  @IsString()
  removeImage?: string;
}