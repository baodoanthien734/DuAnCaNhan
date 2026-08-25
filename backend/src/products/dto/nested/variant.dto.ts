import { IsString, IsOptional, IsNumber, Min, IsUrl } from 'class-validator';

export class CreateVariantDto {
  @IsString()
  name!: string;

  @IsOptional()
  @IsString()
  sku?: string;

  @IsNumber()
  @Min(0)
  price!: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  stock?: number;

  @IsOptional()
  @IsString() 
  image?: string;

  @IsOptional()
  @IsNumber()
  id?: number;
}