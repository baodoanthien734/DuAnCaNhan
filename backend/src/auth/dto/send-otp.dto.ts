import { IsEmail, IsNotEmpty } from 'class-validator';
import { i18nValidationMessage } from 'nestjs-i18n';

export class SendOtpDto {
  @IsEmail({}, { message: i18nValidationMessage('auth.validation.email_invalid') })
  @IsNotEmpty({ message: i18nValidationMessage('auth.validation.email_required') })
  email!: string;
}