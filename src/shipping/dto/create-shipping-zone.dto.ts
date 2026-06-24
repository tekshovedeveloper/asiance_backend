import { IsArray, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class CreateShippingZoneDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsOptional()
  @IsArray()
  regions?: string[];
}