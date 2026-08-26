import { IsInt, IsOptional, IsPositive, Min, IsNotEmpty } from 'class-validator';
import { i18nValidationMessage } from 'nestjs-i18n';


export class AddCartItemDto {
  @IsInt({ message: i18nValidationMessage('cart.validation.product_id_int') })
  @IsPositive({ message: i18nValidationMessage('cart.validation.product_id_positive') })
  @IsNotEmpty({ message: i18nValidationMessage('cart.validation.product_id_required') })
  productId!: number;


  @IsOptional()
  @IsInt({ message: i18nValidationMessage('cart.validation.variant_id_int') })
  @IsPositive({ message: i18nValidationMessage('cart.validation.variant_id_positive') })
  variantId?: number;


  @IsInt({ message: i18nValidationMessage('cart.validation.quantity_int') })
  @Min(1, { message: i18nValidationMessage('cart.validation.quantity_min') })
  @IsNotEmpty({ message: i18nValidationMessage('cart.validation.quantity_required') })
  quantity!: number;


  @IsOptional()
  customizations?: any;
}