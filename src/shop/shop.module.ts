import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Order, OrderSchema } from './order.schema';
import { Product, ProductSchema } from './product.schema';
import {
  ProductAttribute,
  ProductAttributeSchema,
  ProductBrand,
  ProductBrandSchema,
  ProductCategory,
  ProductCategorySchema,
  ProductTag,
  ProductTagSchema,
} from './product-taxonomy.schema';
import { ShopController } from './shop.controller';
import { ShopService } from './shop.service';
import { EmailModule } from '../email/email.module';
import { UsersModule } from '../users/users.module';


@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Product.name, schema: ProductSchema },
      { name: ProductCategory.name, schema: ProductCategorySchema },
      { name: ProductBrand.name, schema: ProductBrandSchema },
      { name: ProductTag.name, schema: ProductTagSchema },
      { name: ProductAttribute.name, schema: ProductAttributeSchema },
      { name: Order.name, schema: OrderSchema },
    ]),
    EmailModule,
    UsersModule,
  ],
  controllers: [ShopController],
  providers: [ShopService],
  exports: [ShopService, MongooseModule],
})
export class ShopModule {}
