import { IsInt, IsOptional, IsString, IsArray, Min, Max } from 'class-validator';

export class CreateReviewDto {
  @IsInt()
  productId!: number;

  @IsInt()
  orderId!: number;

  @IsInt()
  @Min(1)
  @Max(5)
  rating!: number;

  @IsOptional()
  @IsString()
  comment?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  images?: string[];
}