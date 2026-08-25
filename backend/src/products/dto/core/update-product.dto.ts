import { PartialType, OmitType } from '@nestjs/mapped-types'; 
import { CreateProductDto } from './create-product.dto';
import { IsOptional, IsArray, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { CreateCustomizationDto } from '../nested/customization.dto'; 

export class UpdateProductDto extends PartialType(
  OmitType(CreateProductDto, ['variants', 'customizations'] as const)
) {
  @IsOptional()
  @IsArray()
  variants?: any[];

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateCustomizationDto)
  customizations?: CreateCustomizationDto[];
}