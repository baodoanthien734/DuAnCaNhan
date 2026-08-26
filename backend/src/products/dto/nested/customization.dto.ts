import { IsString, IsOptional, IsNumber, IsBoolean, IsEnum, ValidateNested, ValidateIf, Min, IsArray, IsNotEmpty, MaxLength, Matches } from 'class-validator';
import { Type } from 'class-transformer';
import { CustomizationType } from '@prisma/client';
import { i18nValidationMessage } from 'nestjs-i18n';


export class CustomizationChoiceDto {
  @IsString({ message: i18nValidationMessage('products.validation.choice_label_string') })
  @IsNotEmpty({ message: i18nValidationMessage('products.validation.choice_label_required') })
  @MaxLength(100, { message: i18nValidationMessage('products.validation.choice_label_max_length') })
  label!: string;


  @IsOptional()
  @IsNumber({}, { message: i18nValidationMessage('products.validation.choice_extra_price_number') })
  @Min(0, { message: i18nValidationMessage('products.validation.choice_extra_price_min') })
  extraPrice?: number;


  @IsOptional()
  @IsNumber({}, { message: i18nValidationMessage('products.validation.choice_id_number') })
  id?: number;
}


export class CreateCustomizationDto {
  @IsString({ message: i18nValidationMessage('products.validation.customization_name_string') })
  @IsNotEmpty({ message: i18nValidationMessage('products.validation.customization_name_required') })
  @MaxLength(100, { message: i18nValidationMessage('products.validation.customization_name_max_length') })
  @Matches(/[a-zA-Z\p{L}]/u, { 
    message: i18nValidationMessage('products.validation.name_invalid_format') 
  })
  name!: string;


  @IsEnum(CustomizationType, { message: i18nValidationMessage('products.validation.customization_type_invalid') })
  @IsNotEmpty({ message: i18nValidationMessage('products.validation.customization_type_required') })
  type!: CustomizationType;


  @IsOptional()
  @IsBoolean({ message: i18nValidationMessage('products.validation.customization_required_boolean') })
  isRequired?: boolean;


  @ValidateIf(o => o.type === CustomizationType.TEXT, { message: i18nValidationMessage('products.validation.customization_max_length_required_for_text') })
  @IsNumber({}, { message: i18nValidationMessage('products.validation.customization_max_length_number') })
  @Min(1, { message: i18nValidationMessage('products.validation.customization_max_length_min') })
  maxLength?: number;


  @IsOptional()
  @IsNumber({}, { message: i18nValidationMessage('products.validation.customization_extra_price_number') })
  @Min(0, { message: i18nValidationMessage('products.validation.customization_extra_price_min') })
  extraPrice?: number;


  @ValidateIf(o => o.type === CustomizationType.SELECT, { message: i18nValidationMessage('products.validation.customization_choices_required_for_select') })
  @IsArray({ message: i18nValidationMessage('products.validation.customization_choices_array') })
  @ValidateNested({ each: true })
  @Type(() => CustomizationChoiceDto)
  choices?: CustomizationChoiceDto[];


  @IsOptional()
  @IsNumber({}, { message: i18nValidationMessage('products.validation.customization_id_number') })
  id?: number;
}