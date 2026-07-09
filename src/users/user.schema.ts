// import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
// import { HydratedDocument, Types } from 'mongoose';

// export type UserDocument = HydratedDocument<User>;

// @Schema({ timestamps: true })
// export class User {
//   @Prop({ required: true, trim: true })
//   name: string;

//   @Prop({ required: true, unique: true, lowercase: true, trim: true })
//   email: string;

//   @Prop({ required: true, unique: true, lowercase: true, trim: true })
//   handle: string;

//   @Prop({ required: true })
//   passwordHash: string;

//   @Prop({ enum: ['admin', 'member'], default: 'member' })
//   role: 'admin' | 'member';

//   @Prop({ default: '' })
//   avatar: string;

//   @Prop({ default: '' })
//   cover: string;

//   @Prop({ default: '' })
//   firstName: string;

//   @Prop({ default: '' })
//   lastName: string;

//   @Prop({ default: '' })
//   phone: string;

//   @Prop({ default: '' })
//   country: string;

//   @Prop({ default: false })
//   isVerified: boolean;

//   @Prop({ default: '' })
//   bio: string;

//   @Prop({ default: '' })
//   location: string;

//   @Prop({ default: 'active now' })
//   status: string;

//   @Prop({ type: [String], default: [] })
//   interests: string[];

//   @Prop({ type: [{ type: Types.ObjectId, ref: 'User' }], default: [] })
//   following: Types.ObjectId[];

//   @Prop({ type: [{ type: Types.ObjectId, ref: 'Group' }], default: [] })
//   groups: Types.ObjectId[];

//   @Prop({ default: false })
//   isBlocked: boolean;
// }

// export const UserSchema = SchemaFactory.createForClass(User);
// UserSchema.index({ name: 'text', handle: 'text', bio: 'text', location: 'text' });








import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';

export type UserDocument = HydratedDocument<User>;

@Schema({ timestamps: true })
export class User {
  @Prop({ required: true, trim: true })
  name: string;

  @Prop({ required: true, unique: true, lowercase: true, trim: true })
  email: string;

  @Prop({ required: true, unique: true, lowercase: true, trim: true })
  handle: string;

  @Prop({ required: true })
  passwordHash: string;

  @Prop({ enum: ['admin', 'member'], default: 'member' })
  role: 'admin' | 'member';

  @Prop({ default: '' })
  avatar: string;

  @Prop({ default: '' })
  cover: string;

  @Prop({ default: '' })
  firstName: string;

  @Prop({ default: '' })
  lastName: string;

  @Prop({ default: '' })
  phone: string;

  @Prop({ default: '' })
  country: string;

  @Prop({ default: false })
  isVerified: boolean;

  @Prop({ default: '' })
  bio: string;

  @Prop({ default: '' })
  location: string;

  @Prop({ default: 'active now' })
  status: string;

  @Prop({ type: [String], default: [] })
  interests: string[];

  @Prop({ type: [{ type: Types.ObjectId, ref: 'User' }], default: [] })
  following: Types.ObjectId[];

  @Prop({ type: [{ type: Types.ObjectId, ref: 'Group' }], default: [] })
  groups: Types.ObjectId[];

  @Prop({ default: false })
  isBlocked: boolean;

  // Added for WordPress migration
  @Prop({ unique: true, sparse: true })
  legacyWpId?: number;

  // Added for WordPress migration
  @Prop({ default: false })
  passwordResetRequired: boolean;

  // Added for WordPress migration
  @Prop({ enum: ['app', 'wordpress'], default: 'app' })
  source: 'app' | 'wordpress';
}

export const UserSchema = SchemaFactory.createForClass(User);

UserSchema.index({
  name: 'text',
  handle: 'text',
  bio: 'text',
  location: 'text',
});