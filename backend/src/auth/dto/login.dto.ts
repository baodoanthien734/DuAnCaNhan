import { IsEmail, IsNotEmpty, IsString } from 'class-validator';
import { i18nValidationMessage } from 'nestjs-i18n';

export class LoginDto {
  @IsEmail({}, { message: i18nValidationMessage('auth.validation.email_invalid') })
  @IsNotEmpty({ message: i18nValidationMessage('auth.validation.email_required') })
  email!: string;

  @IsString({ message: i18nValidationMessage('auth.validation.password_required') })
  @IsNotEmpty({ message: i18nValidationMessage('auth.validation.password_required') })
  password!: string;
}