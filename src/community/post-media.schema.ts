import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';

export type PostMediaDocument = HydratedDocument<PostMedia>;

@Schema({ timestamps: true })
export class PostMedia {
  @Prop({ type: Types.ObjectId, ref: 'Activity', required: true })
  activityId: Types.ObjectId;

  @Prop({ required: true })
  type: 'image' | 'video' | 'audio' | 'file' | 'gif';

  @Prop({ required: true })
  url: string;

  @Prop({ default: '' })
  caption: string;
}

export const PostMediaSchema = SchemaFactory.createForClass(PostMedia);
