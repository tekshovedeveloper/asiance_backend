import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type ShippingZoneDocument = HydratedDocument<ShippingZone>;

export type ShippingMethodType = 'free_shipping' | 'flat_rate' | 'local_pickup';

@Schema({ timestamps: true })
export class ShippingMethod {
  @Prop({ required: true })
  title: string;

  @Prop({ required: true, enum: ['free_shipping', 'flat_rate', 'local_pickup'] })
  type: ShippingMethodType;

  @Prop({ default: true })
  enabled: boolean;

  @Prop({ default: 0 })
  cost: number;

  @Prop({ default: 'minimum_order' })
  freeShippingRequirement: string;

  @Prop({ default: 0 })
  minimumOrderAmount: number;
}

export const ShippingMethodSchema = SchemaFactory.createForClass(ShippingMethod);

@Schema({ timestamps: true })
export class ShippingZone {
  @Prop({ required: true })
  name: string;

  @Prop({ type: [String], default: ['everywhere'] })
  regions: string[];

  @Prop({ type: [ShippingMethodSchema], default: [] })
  methods: ShippingMethod[];
}

export const ShippingZoneSchema = SchemaFactory.createForClass(ShippingZone);
