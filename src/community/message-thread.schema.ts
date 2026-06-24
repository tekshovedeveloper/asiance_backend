import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';

export type MessageThreadDocument = HydratedDocument<MessageThread>;

@Schema({ timestamps: true })
export class Message {
  @Prop({ type: Types.ObjectId, default: () => new Types.ObjectId() })
  _id: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'User' })
  senderId?: Types.ObjectId;

  @Prop({ default: 'Asiance Member' })
  senderName: string;

  @Prop({ default: '' })
  senderAvatar: string;

  @Prop({ default: '' })
  body: string;

  @Prop({ default: '' })
  mediaUrl: string;

  @Prop({ default: '' })
  mediaType: string;
}

@Schema({ timestamps: true })
export class MessageThread {
  @Prop({ default: '' })
  title: string;

  @Prop({ type: [{ type: Types.ObjectId, ref: 'User' }], default: [] })
  participants: Types.ObjectId[];

  @Prop({ type: [Message], default: [] })
  messages: Message[];

  @Prop({ default: Date.now })
  lastMessageAt: Date;

  @Prop({ type: Object, default: {} })
  lastReadAt: Record<string, number>;
}

export const MessageThreadSchema = SchemaFactory.createForClass(MessageThread);
