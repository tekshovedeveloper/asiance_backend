import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Article, ArticleSchema } from '../content/article.schema';
import { NewsItem, NewsItemSchema } from '../news/news-item.schema';
import { Group, GroupSchema } from '../community/group.schema';
import { Product, ProductSchema } from '../shop/product.schema';
import { User, UserSchema } from '../users/user.schema';
import { SearchController } from './search.controller';
import { SearchService } from './search.service';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Article.name, schema: ArticleSchema },
      { name: User.name, schema: UserSchema },
      { name: NewsItem.name, schema: NewsItemSchema },
      { name: Group.name, schema: GroupSchema },
      { name: Product.name, schema: ProductSchema },
    ]),
  ],
  controllers: [SearchController],
  providers: [SearchService],
})
export class SearchModule {}
