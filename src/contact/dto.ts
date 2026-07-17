import { IsEmail, IsOptional, IsString, Length, MaxLength } from 'class-validator';

export class ContactInquiryDto {
  @IsString()
  @Length(2, 80)
  name: string;

  @IsEmail()
  email: string;

  @IsString()
  @Length(2, 120)
  subject: string;

  @IsString()
  @Length(10, 2000)
  message: string;

  @IsString()
  @IsOptional()
  @MaxLength(40)
  phone?: string;

  @IsString()
  @IsOptional()
  @MaxLength(60)
  topic?: string;
}
