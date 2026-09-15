import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';

export type HomeSlideDocument = HydratedDocument<HomeSlide>;

@Schema({ timestamps: true })
export class HomeSlide {
  @Prop({ type: Types.ObjectId, ref: 'Article', required: true })
  articleId: Types.ObjectId;

  @Prop({ required: true, trim: true })
  image: string;

  @Prop({ default: '', trim: true })
  imageAlt: string;

  @Prop({ default: 0, min: 0 })
  sortOrder: number;

  @Prop({ default: true })
  active: boolean;
}

export const HomeSlideSchema = SchemaFactory.createForClass(HomeSlide);
HomeSlideSchema.index({ active: 1, sortOrder: 1, createdAt: 1 });
