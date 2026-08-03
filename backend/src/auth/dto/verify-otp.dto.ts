import { IsEmail, IsNotEmpty, IsString, Length } from 'class-validator';
import { i18nValidationMessage } from 'nestjs-i18n';

export class VerifyOtpDto {
  @IsEmail({}, { message: i18nValidationMessage('auth.validation.email_invalid') })
  @IsNotEmpty({ message: i18nValidationMessage('auth.validation.email_required') })
  email!: string;

  @IsString({ message: i18nValidationMessage('auth.validation.otp_string') })
  @Length(6, 6, { message: i18nValidationMessage('auth.validation.otp_length') })
  code!: string;
}