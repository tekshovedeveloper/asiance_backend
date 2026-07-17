import { ArrayMaxSize, IsArray, IsBoolean, IsEmail, IsOptional, IsString, MaxLength } from 'class-validator';

export class UpdateMeDto {
  @IsOptional()
  @IsString()
  @MaxLength(80)
  name?: string;

  // username in frontend = handle in DB
  @IsOptional()
  @IsString()
  @MaxLength(30)
  username?: string;

  @IsOptional()
  @IsEmail()
  email?: string;

  @IsOptional()
  @IsString()
  @MaxLength(250)
  bio?: string;

  @IsOptional()
  @IsString()
  @MaxLength(220)
  facebookUrl?: string;

  @IsOptional()
  @IsString()
  @MaxLength(220)
  instagramUrl?: string;

  @IsOptional()
  @IsString()
  @MaxLength(220)
  tiktokUrl?: string;

  @IsOptional()
  @IsString()
  @MaxLength(220)
  snapchatUrl?: string;

  @IsOptional()
  @IsString()
  @MaxLength(220)
  emailLink?: string;

  @IsOptional()
  @IsBoolean()
  showFriends?: boolean;

  @IsOptional()
  @IsBoolean()
  showProducts?: boolean;

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(6)
  @IsString({ each: true })
  @MaxLength(40, { each: true })
  interests?: string[];

  @IsOptional()
  @IsString()
  avatarUrl?: string;

  @IsOptional()
  @IsString()
  coverImageUrl?: string;
}
