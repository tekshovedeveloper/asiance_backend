import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';

export type ForumThreadDocument = HydratedDocument<ForumThread>;

@Schema({ timestamps: true })
export class ForumThread {
  @Prop({ required: true })
  title: string;

  @Prop({ required: true, unique: true, lowercase: true })
  slug: string;

  @Prop({ default: 'general' })
  category: string;

  @Prop({ default: '' })
  groupSlug: string;

  @Prop({ type: Types.ObjectId, ref: 'User' })
  authorId?: Types.ObjectId;

  @Prop({ default: 'Asiance Member' })
  authorName: string;

  @Prop({ default: '' })
  excerpt: string;

  @Prop({ default: 0 })
  replies: number;

  @Prop({ default: false })
  pinned: boolean;

  @Prop({ default: Date.now })
  lastActivityAt: Date;
}

export const ForumThreadSchema = SchemaFactory.createForClass(ForumThread);
