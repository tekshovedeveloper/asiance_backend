import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';

export type FileAssetDocument = HydratedDocument<FileAsset>;

@Schema({ timestamps: true })
export class FileAsset {
  @Prop({ required: true })
  title: string;

  @Prop({ enum: ['file', 'doc', 'media'], default: 'file' })
  type: 'file' | 'doc' | 'media';

  @Prop({ default: 'library' })
  category: string;

  @Prop({ default: '' })
  size: string;

  @Prop({ default: '' })
  url: string;

  @Prop({ type: Types.ObjectId, ref: 'User' })
  ownerId?: Types.ObjectId;

  @Prop({ default: 'Asiance Editors' })
  ownerName: string;
}

export const FileAssetSchema = SchemaFactory.createForClass(FileAsset);
