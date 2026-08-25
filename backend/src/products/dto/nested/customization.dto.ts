import { IsString, IsOptional, IsNumber, IsBoolean, IsEnum, ValidateNested, ValidateIf, Min } from 'class-validator';
import { Type } from 'class-transformer';
import { CustomizationType } from '@prisma/client';

export class CustomizationChoiceDto {
  @IsString()
  label!: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  extraPrice?: number;

  @IsOptional()
  @IsNumber()
  id?: number;
}

export class CreateCustomizationDto {
  @IsString()
  name!: string;

  @IsEnum(CustomizationType)
  type!: CustomizationType;

  @IsOptional()
  @IsBoolean()
  isRequired?: boolean;

  @ValidateIf(o => o.type === CustomizationType.TEXT)
  @IsNumber()
  @Min(1)
  maxLength?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  extraPrice?: number;

  @ValidateIf(o => o.type === CustomizationType.SELECT)
  @ValidateNested({ each: true })
  @Type(() => CustomizationChoiceDto)
  choices?: CustomizationChoiceDto[];

  @IsOptional()
  @IsNumber()
  id?: number;
}