import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type NewsCategoryDocument = HydratedDocument<NewsCategory>;

@Schema({ timestamps: true })
export class NewsCategory {
  @Prop({ required: true, trim: true })
  name: string;

  @Prop({ required: true, unique: true, lowercase: true, trim: true })
  slug: string;

  @Prop({ default: '' })
  description: string;

  @Prop({ default: 0 })
  sortOrder: number;
}

export const NewsCategorySchema = SchemaFactory.createForClass(NewsCategory);
NewsCategorySchema.index({ name: 'text', description: 'text' });
