import { ArrayMaxSize, IsArray, IsBoolean, IsEmail, IsIn, IsOptional, IsString, MaxLength } from 'class-validator';

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
  @MaxLength(160)
  address?: string;

  @IsOptional()
  @IsIn(['public', 'members', 'private'])
  profileVisibility?: 'public' | 'members' | 'private';

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(8)
  @IsString({ each: true })
  @MaxLength(40, { each: true })
  profileTags?: string[];

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(8)
  @IsString({ each: true })
  @MaxLength(40, { each: true })
  hobbies?: string[];

  @IsOptional()
  @IsString()
  @MaxLength(40)
  maritalStatus?: string;

  @IsOptional()
  @IsString()
  @MaxLength(300)
  personalQuestion?: string;

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(3)
  @IsString({ each: true })
  @MaxLength(60, { each: true })
  blogCategoryInterests?: string[];

  @IsOptional()
  @IsString()
  @MaxLength(300)
  blogCategoryReason?: string;

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(3)
  @IsString({ each: true })
  @MaxLength(60, { each: true })
  productCategoryInterests?: string[];

  @IsOptional()
  @IsString()
  @MaxLength(300)
  productCategoryReason?: string;

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(12)
  @IsString({ each: true })
  @MaxLength(80, { each: true })
  communityCircleSlugs?: string[];

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
