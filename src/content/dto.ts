import {
  ArrayMaxSize,
  ArrayUnique,
  IsArray,
  IsBoolean,
  IsDateString,
  IsIn,
  IsInt,
  IsMongoId,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  Min,
} from 'class-validator';

export class ArticleCategoryDto {
  @IsString()
  name: string;

  @IsOptional()
  @IsString()
  slug?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsNumber()
  sortOrder?: number;
}

export class ArticleDto {
  @IsString()
  title: string;

  @IsOptional()
  @IsString()
  slug?: string;

  @IsString()
  category: string;

  @IsOptional()
  @IsString()
  excerpt?: string;

  @IsOptional()
  @IsString()
  content?: string;

  @IsOptional()
  @IsString()
  image?: string;

  @IsOptional()
  @IsString()
  authorName?: string;

  @IsOptional()
  @IsArray()
  tags?: string[];

  @IsOptional()
  @IsBoolean()
  featured?: boolean;

  @IsOptional()
  @IsIn(['draft', 'pending', 'published'])
  status?: 'draft' | 'pending' | 'published';

  @IsOptional()
  @IsDateString()
  publishedAt?: string;
}

export class ArticleCarouselDto {
  @IsArray()
  @ArrayUnique()
  @ArrayMaxSize(24)
  @IsMongoId({ each: true })
  articleIds: string[];

  @IsOptional()
  @IsBoolean()
  autoRotate?: boolean;

  @IsOptional()
  @IsInt()
  @Min(3000)
  @Max(30000)
  rotationIntervalMs?: number;
}
