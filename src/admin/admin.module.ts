import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Activity, ActivitySchema } from '../community/activity.schema';
import { Group, GroupSchema } from '../community/group.schema';
import { Article, ArticleSchema } from '../content/article.schema';
import { NewsCategory, NewsCategorySchema } from '../news/news-category.schema';
import { NewsItem, NewsItemSchema } from '../news/news-item.schema';
import { Order, OrderSchema } from '../shop/order.schema';
import { Product, ProductSchema } from '../shop/product.schema';
import { User, UserSchema } from '../users/user.schema';
import { AdminController } from './admin.controller';
import { AdminService } from './admin.service';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: User.name, schema: UserSchema },
      { name: Article.name, schema: ArticleSchema },
      { name: NewsItem.name, schema: NewsItemSchema },
      { name: NewsCategory.name, schema: NewsCategorySchema },
      { name: Product.name, schema: ProductSchema },
      { name: Order.name, schema: OrderSchema },
      { name: Group.name, schema: GroupSchema },
      { name: Activity.name, schema: ActivitySchema },
    ]),
  ],
  controllers: [AdminController],
  providers: [AdminService],
})
export class AdminModule {}
