import { IsEmail, IsNotEmpty, IsString, MinLength, Matches } from 'class-validator';
import { i18nValidationMessage } from 'nestjs-i18n';

export class RegisterDto {
  @IsEmail({}, { message: i18nValidationMessage('auth.validation.email_invalid') })
  @IsNotEmpty({ message: i18nValidationMessage('auth.validation.email_required') })
  email!: string;

  @IsString()
  @MinLength(6, { message: i18nValidationMessage('auth.validation.otp_min_length') })
  code!: string;

  @IsString()
  @IsNotEmpty({ message: i18nValidationMessage('auth.validation.name_required') })
  name!: string;

  @IsString()
  @MinLength(8, { message: i18nValidationMessage('auth.validation.password_min_length') })
  @Matches(/((?=.*\d)|(?=.*\W+))(?![.\n])(?=.*[A-Z])(?=.*[a-z]).*$/, {
    message: i18nValidationMessage('auth.validation.password_strength'),
  })
  password!: string;
}