import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type ArticleDocument = HydratedDocument<Article>;

@Schema({ timestamps: true })
export class Article {
  @Prop({ required: true, trim: true })
  title: string;

  @Prop({ required: true, unique: true, lowercase: true, trim: true })
  slug: string;

  @Prop({ required: true, trim: true })
  category: string;

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

  @Prop({ default: 0 })
  discussionCount: number;

  @Prop({ default: false })
  featured: boolean;

  @Prop({ default: Date.now })
  publishedAt: Date;
}

export const ArticleSchema = SchemaFactory.createForClass(Article);
ArticleSchema.index({ title: 'text', excerpt: 'text', content: 'text', category: 'text' });
