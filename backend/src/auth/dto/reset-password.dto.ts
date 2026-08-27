import { IsEmail, IsNotEmpty, IsString, Length, MinLength, Matches } from 'class-validator';
import { i18nValidationMessage } from 'nestjs-i18n';

export class ResetPasswordDto {
  @IsEmail({}, { message: i18nValidationMessage('auth.validation.email_invalid') })
  @IsNotEmpty({ message: i18nValidationMessage('auth.validation.email_required') })
  email!: string;

  @IsString({ message: i18nValidationMessage('auth.validation.otp_string') })
  @Length(6, 6, { message: i18nValidationMessage('auth.validation.otp_length') })
  code!: string;

  @IsString({ message: i18nValidationMessage('auth.validation.password_string') })
  @MinLength(8, { message: i18nValidationMessage('auth.validation.password_min_length') }) 
  @Matches(/((?=.*\d)|(?=.*\W+))(?![.\n])(?=.*[A-Z])(?=.*[a-z]).*$/, {
    message: i18nValidationMessage('auth.validation.password_strength'),
  })
  newPassword!: string;
}