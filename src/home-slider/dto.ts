import { IsBoolean, IsInt, IsMongoId, IsOptional, IsString, Matches, Max, MaxLength, Min } from 'class-validator';

export class HomeSlideDto {
  @IsMongoId()
  articleId: string;

  @IsString()
  @MaxLength(2048)
  @Matches(/^(https?:\/\/[^\s]+|\/api\/uploads\/[^\s]+)$/i, { message: 'Choose an uploaded image or an image URL starting with http or https.' })
  image: string;

  @IsOptional()
  @IsString()
  @MaxLength(300)
  imageAlt?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(10000)
  sortOrder?: number;

  @IsOptional()
  @IsBoolean()
  active?: boolean;
}
