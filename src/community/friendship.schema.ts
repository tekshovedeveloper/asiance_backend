import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';

export type FriendshipDocument = HydratedDocument<Friendship>;

@Schema({ timestamps: true })
export class Friendship {
  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  requesterId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  addresseeId: Types.ObjectId;

  @Prop({ enum: ['pending', 'accepted', 'rejected'], default: 'pending' })
  status: 'pending' | 'accepted' | 'rejected';
}

export const FriendshipSchema = SchemaFactory.createForClass(Friendship);
