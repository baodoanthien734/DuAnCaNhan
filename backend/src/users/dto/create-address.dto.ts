import { Transform } from 'class-transformer';
import { IsBoolean, IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';
import { i18nValidationMessage } from 'nestjs-i18n';

export class CreateAddressDto {
  @IsString({ message: i18nValidationMessage('user.validation.recipient_name_string') })
  @IsNotEmpty({ message: i18nValidationMessage('user.validation.recipient_name_required') })
  @MaxLength(120, { message: i18nValidationMessage('user.validation.recipient_name_max_length') })
  recipientName!: string;

  @IsString({ message: i18nValidationMessage('user.validation.phone_string') })
  @IsNotEmpty({ message: i18nValidationMessage('user.validation.phone_required') })
  @MaxLength(20, { message: i18nValidationMessage('user.validation.phone_max_length') })
  phone!: string;

  @IsString({ message: i18nValidationMessage('user.validation.street_string') })
  @IsNotEmpty({ message: i18nValidationMessage('user.validation.street_required') })
  @MaxLength(255, { message: i18nValidationMessage('user.validation.street_max_length') })
  street!: string;

  @IsString({ message: i18nValidationMessage('user.validation.ward_string') })
  @IsNotEmpty({ message: i18nValidationMessage('user.validation.ward_required') })
  @MaxLength(120, { message: i18nValidationMessage('user.validation.ward_max_length') })
  ward!: string;
  
  @IsString({ message: i18nValidationMessage('user.validation.city_string') })
  @IsNotEmpty({ message: i18nValidationMessage('user.validation.city_required') })
  @MaxLength(120, { message: i18nValidationMessage('user.validation.city_max_length') })
  city!: string;

  @IsOptional()
  @Transform(({ value }) => {
    if (typeof value === 'boolean') return value;
    if (value === 'true') return true;
    if (value === 'false') return false;
    return value;
  })
  @IsBoolean({ message: i18nValidationMessage('user.validation.is_default_boolean') })
  isDefault?: boolean;
}