import { IsBoolean, IsIn, IsNotEmpty, IsNumber, IsOptional, IsString } from 'class-validator';

export class CreateShippingMethodDto {
  @IsString()
  @IsNotEmpty()
  title: string;

  @IsIn(['free_shipping', 'flat_rate', 'local_pickup'])
  type: 'free_shipping' | 'flat_rate' | 'local_pickup';

  @IsOptional()
  @IsBoolean()
  enabled?: boolean;

  @IsOptional()
  @IsNumber()
  cost?: number;

  @IsOptional()
  @IsString()
  freeShippingRequirement?: string;

  @IsOptional()
  @IsNumber()
  minimumOrderAmount?: number;
}