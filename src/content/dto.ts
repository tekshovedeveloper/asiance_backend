import { IsArray, IsBoolean, IsDateString, IsIn, IsNumber, IsOptional, IsString } from 'class-validator';

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
