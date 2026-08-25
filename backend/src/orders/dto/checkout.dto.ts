import { IsInt, IsOptional, IsString, IsEnum, IsNotEmpty, MaxLength } from 'class-validator';
import { PaymentMethod } from '@prisma/client';
import { i18nValidationMessage } from 'nestjs-i18n';


export class CheckoutDto {
  @IsInt({ message: i18nValidationMessage('order.validation.address_id_int') })
  @IsNotEmpty({ message: i18nValidationMessage('order.validation.address_id_required') })
  addressId!: number;


  @IsEnum(PaymentMethod, { message: i18nValidationMessage('order.validation.payment_method_invalid') })
  @IsNotEmpty({ message: i18nValidationMessage('order.validation.payment_method_required') })
  paymentMethod!: PaymentMethod;


  @IsOptional()
  @IsString({ message: i18nValidationMessage('order.validation.note_string') })
  @MaxLength(500, { message: i18nValidationMessage('order.validation.note_max_length') })
  note?: string;
}