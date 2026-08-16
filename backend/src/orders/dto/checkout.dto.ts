import { IsInt, IsOptional, IsString, IsEnum } from 'class-validator';
import { PaymentMethod } from '@prisma/client'; // Lấy Enum từ Prisma

export class CheckoutDto {
  @IsInt()
  addressId!: number;

  @IsEnum(PaymentMethod)
  paymentMethod!: PaymentMethod;

  @IsOptional()
  @IsString()
  note?: string;
}