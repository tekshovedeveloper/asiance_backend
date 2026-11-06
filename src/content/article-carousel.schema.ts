import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';
import { Article } from './article.schema';

export type ArticleCarouselDocument = HydratedDocument<ArticleCarousel>;

@Schema({ timestamps: true })
export class ArticleCarousel {
  @Prop({ required: true, unique: true, lowercase: true, trim: true })
  section: string;

  @Prop({ type: [{ type: Types.ObjectId, ref: Article.name }], default: [] })
  articleIds: Types.ObjectId[];

  @Prop({ default: true })
  autoRotate: boolean;

  @Prop({ default: 6000, min: 3000, max: 30000 })
  rotationIntervalMs: number;
}

export const ArticleCarouselSchema = SchemaFactory.createForClass(ArticleCarousel);
