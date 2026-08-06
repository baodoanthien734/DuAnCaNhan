import { IsOptional, IsString, MaxLength } from 'class-validator';
import { i18nValidationMessage } from 'nestjs-i18n';

export class UpdateProfileDto {
  @IsOptional()
  @IsString({ message: i18nValidationMessage('user.validation.name_string') })
  @MaxLength(100, { message: i18nValidationMessage('user.validation.name_max_length') })
  name?: string;
}