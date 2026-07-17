import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type ArticleCategoryDocument = HydratedDocument<ArticleCategory>;

@Schema({ timestamps: true })
export class ArticleCategory {
  @Prop({ required: true, trim: true })
  name: string;

  @Prop({ required: true, unique: true, lowercase: true, trim: true })
  slug: string;

  @Prop({ default: '' })
  description: string;

  @Prop({ default: 0 })
  sortOrder: number;
}

export const ArticleCategorySchema = SchemaFactory.createForClass(ArticleCategory);
ArticleCategorySchema.index({ name: 'text', description: 'text' });
