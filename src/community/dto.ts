import { IsArray, IsBoolean, IsOptional, IsString } from 'class-validator';

export class GroupTypeDto {
  @IsString()
  name: string;

  @IsOptional()
  @IsString()
  slug?: string;

  @IsOptional()
  @IsString()
  description?: string;
}

export class GroupDto {
  @IsString()
  name: string;

  @IsOptional()
  @IsString()
  slug?: string;

  @IsOptional()
  @IsString()
  groupTypeSlug?: string;

  @IsOptional()
  @IsString()
  category?: string;

  @IsOptional()
  @IsString()
  privacy?: 'public' | 'private';

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  bio?: string;

  @IsOptional()
  @IsString()
  image?: string;

  @IsOptional()
  @IsString()
  profilePicture?: string;

  @IsOptional()
  @IsString()
  coverPhoto?: string;

  @IsOptional()
  @IsArray()
  tags?: string[];
}

export class ActivityDto {
  @IsString()
  text: string;

  @IsOptional()
  @IsString()
  privacy?: 'public' | 'friends' | 'group' | 'private';

  @IsOptional()
  @IsString()
  groupSlug?: string;

  @IsOptional()
  @IsString()
  linkPreview?: string;

  @IsOptional()
  @IsString()
  quote?: string;

  @IsOptional()
  @IsArray()
  hashtags?: string[];

  @IsOptional()
  @IsArray()
  mentions?: string[];

  @IsOptional()
  @IsArray()
  media?: Array<{ type: string; url: string; caption?: string }>;

  @IsOptional()
  @IsString()
  targetName?: string;

  @IsOptional()
  @IsString()
  targetSlug?: string;

  @IsOptional()
  @IsString()
  type?: 'post' | 'comment' | 'join' | 'thread' | 'product';
}

export class ActivityUpdateDto {
  @IsOptional()
  @IsString()
  text?: string;

  @IsOptional()
  @IsString()
  type?: 'post' | 'comment' | 'join' | 'thread' | 'product';

  @IsOptional()
  @IsString()
  targetName?: string;

  @IsOptional()
  @IsString()
  targetSlug?: string;

  @IsOptional()
  @IsArray()
  media?: Array<{ type: string; url: string; caption?: string }>;
}

export class ActivityCommentDto {
  @IsString()
  body: string;
}

export class ReactionDto {
  @IsString()
  reaction: 'like' | 'love' | 'celebrate' | 'laugh' | 'sad' | 'angry';
}

export class ForumThreadDto {
  @IsString()
  title: string;

  @IsOptional()
  @IsString()
  category?: string;

  @IsOptional()
  @IsString()
  groupSlug?: string;

  @IsOptional()
  @IsString()
  excerpt?: string;

  @IsOptional()
  @IsBoolean()
  pinned?: boolean;
}

export class FileAssetDto {
  @IsString()
  title: string;

  @IsOptional()
  @IsString()
  type?: 'file' | 'doc' | 'media';

  @IsOptional()
  @IsString()
  category?: string;

  @IsOptional()
  @IsString()
  size?: string;

  @IsOptional()
  @IsString()
  url?: string;
}

export class MessageDto {
  @IsOptional()
  @IsString()
  body?: string;

  @IsOptional()
  @IsString()
  mediaUrl?: string;

  @IsOptional()
  @IsString()
  mediaType?: string;
}

export class CreateThreadDto {
  @IsString()
  participantId: string;
}
