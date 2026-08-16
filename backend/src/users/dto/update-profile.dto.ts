import { Transform } from 'class-transformer';
import { IsBoolean, IsOptional, IsString, MaxLength } from 'class-validator';
import { i18nValidationMessage } from 'nestjs-i18n';

export class UpdateProfileDto {
  @IsOptional()
  @IsString({ message: i18nValidationMessage('user.validation.name_string') })
  @MaxLength(100, { message: i18nValidationMessage('user.validation.name_max_length') })
  name?: string;

  @IsOptional()
  @Transform(({ value }) => value === true || value === 'true')
  @IsBoolean({ message: i18nValidationMessage('user.validation.remove_avatar_boolean') })
  removeAvatar?: boolean;
}