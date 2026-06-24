import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type ProductDocument = HydratedDocument<Product>;

@Schema({ timestamps: true })
export class Product {
  @Prop({ required: true, trim: true })
  name: string;

  @Prop({ required: true, unique: true, lowercase: true, trim: true })
  slug: string;

  @Prop({ required: true, trim: true })
  category: string;

  @Prop({ default: '' })
  categorySlug: string;

  @Prop({ default: '' })
  sku: string;

  @Prop({ required: true })
  price: number;

  @Prop()
  salePrice?: number;

  @Prop({ default: '' })
  image: string;

  @Prop({ type: [String], default: [] })
images: string[];

  @Prop({ default: '' })
  badge: string;

  @Prop({ type: [String], default: [] })
  tags: string[];

  @Prop({ type: [String], default: [] })
  brands: string[];

  @Prop({ default: '' })
  description: string;

  @Prop({ default: '' })
  shortDescription: string;

  @Prop({ default: 0 })
  stock: number;

  @Prop({ default: false })
  stockManagement: boolean;

  @Prop({ enum: ['instock', 'outofstock', 'onbackorder'], default: 'instock' })
  stockStatus: 'instock' | 'outofstock' | 'onbackorder';

  @Prop({ default: false })
  soldIndividually: boolean;

  @Prop({ default: '0' })
  weight: string;

  @Prop({ default: '' })
  length: string;

  @Prop({ default: '' })
  width: string;

  @Prop({ default: '' })
  height: string;

  @Prop({ default: '' })
  shippingClass: string;

  @Prop({ default: '' })
  upsells: string;

  @Prop({ default: '' })
  crossSells: string;

  @Prop({ default: '' })
  attributeName: string;

  @Prop({ default: '' })
  attributeValues: string;

  @Prop({ default: true })
  attributeVisible: boolean;

  @Prop({ default: '' })
  purchaseNote: string;

  @Prop({ default: 0 })
  menuOrder: number;

  @Prop({ default: true })
  enableReviews: boolean;

  @Prop({ default: true })
  availableForPos: boolean;

  @Prop({ enum: ['simple', 'variable', 'grouped', 'external'], default: 'simple' })
  type: 'simple' | 'variable' | 'grouped' | 'external';

  @Prop({ default: false })
  virtual: boolean;

  @Prop({ default: false })
  downloadable: boolean;

  @Prop({ default: true })
  featured: boolean;



  @Prop({
    type: [
      {
        name: { type: String, required: true },
        values: { type: [String], default: [] },
        visible: { type: Boolean, default: true },
        variation: { type: Boolean, default: false },
      },
    ],
    default: [],
  })
  attributes: Array<{
    name: string;
    values: string[];
    visible: boolean;
    variation: boolean;
  }>;

  @Prop({
    type: [
      {
        id: { type: String },
        name: { type: String },
        attributes: { type: Object, default: {} },
        sku: { type: String, default: '' },
        price: { type: Number, default: 0 },
        salePrice: { type: Number },
        stock: { type: Number, default: 0 },
        stockStatus: {
          type: String,
          enum: ['instock', 'outofstock', 'onbackorder'],
          default: 'instock',
        },
        image: { type: String, default: '' },
        enabled: { type: Boolean, default: true },
      },
    ],
    default: [],
  })
  variations: Array<{
    id?: string;
    name: string;
    attributes: Record<string, string>;
    sku?: string;
    price?: number;
    salePrice?: number;
    stock?: number;
    stockStatus?: 'instock' | 'outofstock' | 'onbackorder';
    image?: string;
    enabled?: boolean;
  }>;

  

  @Prop({
    type: [
      {
        title: { type: String, required: true },
        description: { type: String, default: '' },
      },
    ],
    default: [],
  })
  details: Array<{
    title: string;
    description: string;
  }>;

  @Prop({ enum: ['active', 'draft', 'archived'], default: 'active' })
  status: 'active' | 'draft' | 'archived';
}

export const ProductSchema = SchemaFactory.createForClass(Product);
ProductSchema.index({ name: 'text', description: 'text', category: 'text', sku: 'text' });
