import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';

export type GroupDocument = HydratedDocument<Group>;

@Schema({ timestamps: true })
export class Group {
  @Prop({ required: true, trim: true })
  name: string;

  @Prop({ required: true, unique: true, lowercase: true, trim: true })
  slug: string;

  @Prop({ default: '' })
  groupTypeSlug: string;

  @Prop({ default: 'circle' })
  category: string;

  @Prop({ enum: ['public', 'private'], default: 'public' })
  privacy: 'public' | 'private';

  @Prop({ default: '' })
  description: string;

  @Prop({ default: '' })
  bio: string;

  @Prop({ default: '' })
  image: string;

  @Prop({ default: '' })
  profilePicture: string;

  @Prop({ default: '' })
  coverPhoto: string;

  @Prop({ default: 0 })
  membersCount: number;

  @Prop({ type: [{ type: Types.ObjectId, ref: 'User' }], default: [] })
  members: Types.ObjectId[];

  @Prop({ type: [{ type: Types.ObjectId, ref: 'User' }], default: [] })
  pendingMembers: Types.ObjectId[];

  @Prop({ type: [{ type: Types.ObjectId, ref: 'User' }], default: [] })
  blockedMembers: Types.ObjectId[];

  @Prop({ type: [String], default: [] })
  tags: string[];
}

export const GroupSchema = SchemaFactory.createForClass(Group);
GroupSchema.index({ name: 'text', description: 'text', category: 'text' });
