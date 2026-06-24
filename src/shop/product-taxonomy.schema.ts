import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type ProductCategoryDocument = HydratedDocument<ProductCategory>;
export type ProductBrandDocument = HydratedDocument<ProductBrand>;
export type ProductTagDocument = HydratedDocument<ProductTag>;
export type ProductAttributeDocument = HydratedDocument<ProductAttribute>;

@Schema({ timestamps: true })
export class ProductCategory {
  @Prop({ required: true, trim: true })
  name: string;

  @Prop({ required: true, unique: true, lowercase: true, trim: true })
  slug: string;

  @Prop({ default: '' })
  description: string;

  @Prop({ default: '' })
  parentSlug: string;

  @Prop({ default: '' })
  image: string;

  @Prop({ default: 'default' })
  displayType: string;
}

@Schema({ timestamps: true })
export class ProductBrand {
  @Prop({ required: true, trim: true })
  name: string;

  @Prop({ required: true, unique: true, lowercase: true, trim: true })
  slug: string;

  @Prop({ default: '' })
  description: string;

  @Prop({ default: '' })
  parentSlug: string;

  @Prop({ default: '' })
  image: string;
}

@Schema({ timestamps: true })
export class ProductTag {
  @Prop({ required: true, trim: true })
  name: string;

  @Prop({ required: true, unique: true, lowercase: true, trim: true })
  slug: string;

  @Prop({ default: '' })
  description: string;
}

@Schema({ timestamps: true })
export class ProductAttribute {
  @Prop({ required: true, trim: true })
  name: string;

  @Prop({ required: true, unique: true, lowercase: true, trim: true })
  slug: string;

  @Prop({ default: false })
  enableArchives: boolean;

  @Prop({ default: 'menu_order' })
  sortOrder: string;

  @Prop({ type: [String], default: [] })
  terms: string[];
}

export const ProductCategorySchema = SchemaFactory.createForClass(ProductCategory);
export const ProductBrandSchema = SchemaFactory.createForClass(ProductBrand);
export const ProductTagSchema = SchemaFactory.createForClass(ProductTag);
export const ProductAttributeSchema = SchemaFactory.createForClass(ProductAttribute);
