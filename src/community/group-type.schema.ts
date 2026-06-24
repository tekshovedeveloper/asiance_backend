import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type GroupTypeDocument = HydratedDocument<GroupType>;

@Schema({ timestamps: true })
export class GroupType {
  @Prop({ required: true, trim: true })
  name: string;

  @Prop({ required: true, unique: true, lowercase: true, trim: true })
  slug: string;

  @Prop({ default: '' })
  description: string;
}

export const GroupTypeSchema = SchemaFactory.createForClass(GroupType);
