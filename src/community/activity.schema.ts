import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';

export type ActivityDocument = HydratedDocument<Activity>;

@Schema({ timestamps: true })
export class Activity {
  @Prop({ type: Types.ObjectId, ref: 'User' })
  actorId?: Types.ObjectId;

  @Prop({ required: true })
  actorName: string;

  @Prop({ default: '' })
  actorHandle: string;

  @Prop({ enum: ['post', 'comment', 'join', 'thread', 'product'], default: 'post' })
  type: 'post' | 'comment' | 'join' | 'thread' | 'product';

  @Prop({ enum: ['public', 'friends', 'group', 'private'], default: 'public' })
  privacy: 'public' | 'friends' | 'group' | 'private';

  @Prop({ default: false })
  featured: boolean;

  @Prop({ required: true })
  text: string;

  @Prop({ default: '' })
  targetName: string;

  @Prop({ default: '' })
  targetSlug: string;

  @Prop({ default: 0 })
  likes: number;

  @Prop({ default: 0 })
  comments: number;

  @Prop({
    type: {
      like: { type: Number, default: 0 },
      love: { type: Number, default: 0 },
      celebrate: { type: Number, default: 0 },
      laugh: { type: Number, default: 0 },
      sad: { type: Number, default: 0 },
      angry: { type: Number, default: 0 },
    },
    default: {},
  })
  reactions: {
    like: number;
    love: number;
    celebrate: number;
    laugh: number;
    sad: number;
    angry: number;
  };

  @Prop({ type: Map, of: String, default: {} })
  reactedBy: Map<string, string>;

  @Prop({ type: [String], default: [] })
  likedBy: string[];

  @Prop({ type: [{ type: String }], default: [] })
  hashtags: string[];

  @Prop({ type: [{ type: String }], default: [] })
  mentions: string[];

  @Prop({ default: '' })
  linkPreview: string;

  @Prop({
    type: [
      {
        type: { type: String, default: 'image' },
        url: { type: String, required: true },
        caption: { type: String, default: '' },
      },
    ],
    default: [],
  })
  media: Array<{ type: string; url: string; caption?: string }>;

  @Prop({ default: '' })
  quote: string;

  @Prop({ default: '' })
  groupSlug: string;

  @Prop({
    type: [
      {
        authorId: { type: Types.ObjectId, ref: 'User' },
        authorName: { type: String, required: true },
        authorHandle: { type: String, default: '' },
        body: { type: String, required: true },
        likes: { type: Number, default: 0 },
        likedBy: { type: [String], default: [] },
        replies: {
          type: [
            {
              authorId: { type: Types.ObjectId, ref: 'User' },
              authorName: { type: String, required: true },
              authorHandle: { type: String, default: '' },
              body: { type: String, required: true },
              createdAt: { type: Date, default: Date.now },
            },
          ],
          default: [],
        },
        createdAt: { type: Date, default: Date.now },
      },
    ],
    default: [],
  })
  commentsList: Array<{
    authorId?: Types.ObjectId;
    authorName: string;
    authorHandle?: string;
    body: string;
    likes?: number;
    likedBy?: string[];
    replies?: Array<{
      authorId?: Types.ObjectId;
      authorName: string;
      authorHandle?: string;
      body: string;
      createdAt?: Date;
    }>;
    createdAt?: Date;
  }>;
}

export const ActivitySchema = SchemaFactory.createForClass(Activity);
