import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type NewsItemDocument = HydratedDocument<NewsItem>;

@Schema({ timestamps: true })
export class NewsItem {
  @Prop({ required: true, trim: true })
  title: string;

  @Prop({ required: true, unique: true, lowercase: true, trim: true })
  slug: string;

  @Prop({ required: true, trim: true })
  categoryName: string;

  @Prop({ required: true, lowercase: true, trim: true })
  categorySlug: string;

  @Prop({ default: '' })
  excerpt: string;

  @Prop({ default: '' })
  content: string;

  @Prop({ default: '' })
  image: string;

  @Prop({ default: 'Asiance Editors' })
  authorName: string;

  @Prop({ type: [String], default: [] })
  tags: string[];

  @Prop({ default: false })
  featured: boolean;

  @Prop({ default: false })
  breaking: boolean;

  @Prop({ default: '' })
  sourceName: string;

  @Prop({ default: '' })
  sourceUrl: string;

  @Prop({ enum: ['draft', 'published'], default: 'published' })
  status: 'draft' | 'published';

  @Prop({ default: Date.now })
  publishedAt: Date;
}

export const NewsItemSchema = SchemaFactory.createForClass(NewsItem);
NewsItemSchema.index({
  title: 'text',
  excerpt: 'text',
  content: 'text',
  categoryName: 'text',
  sourceName: 'text',
});
NewsItemSchema.index({ categorySlug: 1, publishedAt: -1 });
NewsItemSchema.index({ featured: 1, publishedAt: -1 });
NewsItemSchema.index({ breaking: 1, publishedAt: -1 });
