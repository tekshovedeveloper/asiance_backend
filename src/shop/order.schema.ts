// import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
// import { HydratedDocument, Types } from 'mongoose';

// export type OrderDocument = HydratedDocument<Order>;

// @Schema({ _id: false })
// class OrderItem {
//   @Prop({ required: true })
//   productId: string;

//   @Prop({ required: true })
//   name: string;

//   @Prop({ required: true })
//   quantity: number;

//   @Prop({ required: true })
//   price: number;
// }

// @Schema({ timestamps: true })
// export class Order {
//   @Prop({ type: Types.ObjectId, ref: 'User' })
//   userId?: Types.ObjectId;

//   @Prop({ required: true, lowercase: true, trim: true })
//   email: string;

//   @Prop({ default: '' })
//   name: string;

//   @Prop({ default: '' })
//   address: string;

//   @Prop({ type: [OrderItem], default: [] })
//   items: OrderItem[];

//   @Prop({ required: true })
//   total: number;

//   @Prop({ enum: ['pending', 'paid', 'fulfilled', 'cancelled'], default: 'pending' })
//   status: 'pending' | 'paid' | 'fulfilled' | 'cancelled';
// }

// export const OrderSchema = SchemaFactory.createForClass(Order);





import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';

export type OrderDocument = HydratedDocument<Order>;

export type OrderStatus =
  | 'pending'
  | 'processing'
  | 'shipped'
  | 'completed'
  | 'cancelled'
  | 'refunded'
  | 'failed'
  | 'trash';

@Schema({ _id: false })
class OrderItem {
  @Prop({ default: '' })
  productId?: string;

  @Prop({ default: '' })
  slug?: string;

  @Prop({ required: true })
  name: string;

  @Prop({ default: '' })
  image?: string;

  @Prop({ required: true, default: 1 })
  quantity: number;

  @Prop({ required: true, default: 0 })
  price: number;

  @Prop({ required: true, default: 0 })
  total: number;

  @Prop({ default: '' })
  selectedVariationName?: string;

  @Prop({ type: Object, default: {} })
  selectedAttributes?: Record<string, string>;
}

@Schema({ _id: false })
class OrderNote {
  @Prop({ required: true })
  message: string;

  @Prop({ enum: ['private', 'customer'], default: 'private' })
  type: 'private' | 'customer';

  @Prop({ default: Date.now })
  createdAt: Date;
}

@Schema({ timestamps: true })
export class Order {
  @Prop({ type: Types.ObjectId, ref: 'User' })
  userId?: Types.ObjectId;

  @Prop({ required: true, unique: true })
  orderNumber: number;

  @Prop({
    enum: ['pending', 'processing', 'shipped', 'completed', 'cancelled', 'refunded', 'failed', 'trash'],
    default: 'processing',
  })
  status: OrderStatus;

  @Prop({ required: true, lowercase: true, trim: true })
  email: string;

  @Prop({ default: '', lowercase: true, trim: true })
  billingEmail: string;

  @Prop({ default: '' })
  billingName: string;

  @Prop({ default: '' })
  customerName: string;

  @Prop({ default: '' })
  phone: string;

  @Prop({ default: '' })
  billingAddress: string;

  @Prop({ default: '' })
  shippingAddress: string;

  @Prop({ default: '' })
  orderNotes: string;

  @Prop({ default: 'Website checkout' })
  origin: string;

  @Prop({ default: 'Cash on delivery' })
  paymentMethod: string;

  @Prop({ type: [OrderItem], default: [] })
  items: OrderItem[];

  @Prop({ default: 0 })
  subtotal: number;

  @Prop({ default: 0 })
  shipping: number;

  @Prop({ required: true, default: 0 })
  total: number;

  @Prop({ type: [OrderNote], default: [] })
  notes: OrderNote[];
}

export const OrderSchema = SchemaFactory.createForClass(Order);

OrderSchema.index({
  orderNumber: 1,
  customerName: 'text',
  email: 'text',
});