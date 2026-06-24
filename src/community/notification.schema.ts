import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';

export type NotificationDocument = HydratedDocument<Notification>;

@Schema({ timestamps: true })
export class Notification {
  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  recipientId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'User', default: null })
  actorId?: Types.ObjectId;

  @Prop({ required: true })
  type: 'like' | 'comment' | 'mention' | 'share' | 'friend' | 'group' | 'reaction' | 'message';

  @Prop({ required: true })
  message: string;

  @Prop({ default: false })
  read: boolean;

  @Prop({ default: '' })
  link: string;
}

export const NotificationSchema = SchemaFactory.createForClass(Notification);
